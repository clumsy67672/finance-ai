# Design: Async Queue + OmniRoute Worker for Finance AI

## 1. Overview

Add asynchronous AI parsing pipeline to the existing finance-ai Next.js app. Users submit raw text entries (e.g. "teh 10k", "ayam 20k bensin 15k") which are queued as `PENDING`, then a Python worker script (running on the workstation laptop when powered on) fetches pending entries, calls OmniRoute Gateway for structured JSON parsing, and submits results back.

## 2. Architecture

```
[User/HP] → Cloudflare Tunnel → NPM → finance-ai Web UI
                                      │
                               ┌──────┴──────┐
                               │ /api/queue   │ ← saves raw text, PENDING
                               └──────┬──────┘
                                      │
         ┌────────────────────────────┐
         │  Worker (laptop utama)     │
         │  hermes_worker.py          │
         │  ─ polls GET /api/queue    │
         │  ─ calls OmniRoute API     │
         │  ─ POST /api/transactions  │
         └────────────────────────────┘
```

## 3. Database Changes (Prisma)

Add RawQueue model and link to Transaction:

```prisma
model RawQueue {
  id        String   @id @default(uuid())
  rawText   String
  userId    String?
  createdAt DateTime @default(now())
  status    String   @default("PENDING") // PENDING | PROCESSING | PROCESSED | ERROR
  error     String?
  transactions Transaction[] // reference to created transactions
}

// Add to Transaction model:
// rawQueueId String?
// rawQueue   RawQueue? @relation(fields: [rawQueueId], references: [id])
```

## 4. API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/queue` | Submit raw text to queue (PENDING) |
| GET | `/api/queue?status=PENDING` | List queued entries (worker reads this) |
| GET | `/api/queue/count` | Return count per status |
| PATCH | `/api/queue/:id` | Update status (PROCESSING/PROCESSED/ERROR) |
| POST | `/api/transactions/batch` | Worker submits parsed batch → create transactions + update queue |

## 5. UI Changes

### ChatInput Enhancement
- Add toggle/switch: "Sync" (existing direct AI) vs "Queue" (save as PENDING)
- Submit to `/api/queue` when in Queue mode
- Visual feedback: "Saved to queue — will be processed when workstation is online"

### Dashboard Pending Badge
- Fetch `/api/queue/count` in Dashboard
- Show badge: "X pending entries" when count > 0
- Link to transactions page with queue filter

### Export CSV/JSONL
- Add export buttons in transactions page
- GET `/api/transactions/export?format=csv|jsonl`
- Backend generates file, streams as download

## 6. Worker Script (Python)

File: `worker/hermes_worker.py`

- Polls `SERVER_URL/api/queue?status=PENDING` every 60 seconds
- Sends batch of pending items to OmniRoute Gateway:
  - URL: `OMNIROUTE_URL/v1/chat/completions`
  - Model: `OMNIROUTE_MODEL`
  - System prompt: "Parse Indonesian financial transactions. Return JSON array..."
  - Response format: JSON array of `{rawText, amount, direction, category, description, merchant}`
- Submits parsed results via `POST /api/transactions/batch`
- Marks queue items as PROCESSED or ERROR
- Config via `.env` file with `OMNIROUTE_URL`, `OMNIROUTE_API_KEY`, `SERVER_URL`, `OMNIROUTE_MODEL`

## 7. Docker & Deployment

- Existing `web` service IS the finance-app — no new container needed
- Expose port 3000 (already done in compose)
- Nginx Proxy Manager on merah: add proxy host `finance.azriel.web.id` → `http://web:3000`
- Cloudflare DNS: `finance.azriel.web.id` → tunnel IP
- New env vars: `DATABASE_URL` (already exists), no additional config needed for queue

## 8. Implementation Order

1. Prisma schema (RawQueue model + migration)
2. Queue API endpoints
3. ChatInput queue mode toggle
4. Dashboard pending badge
5. Export CSV/JSONL
6. Worker script
7. Deploy to merah
8. NPM proxy setup
