# Family Finance Chat Ledger

Chat-based personal & family finance tracker built with Next.js App Router, PostgreSQL, Prisma, and the OpenAI Responses API. Every transaction is entered through a conversational input, classified by AI exactly once, and stored permanently in the database. Dashboards, filters, and charts are produced only from SQL data so the ledger remains deterministic and auditable.

## Highlights
- 🚪 **Local auth** – username + password with bcrypt hashing, session cookies, role-based access (admin/member).
- 💬 **Chat-style entry** – parse numbers like `10k` or `5jt`, infer direction (income/expense/transfer), and call OpenAI Structured Outputs for canonical metadata.
- 📊 **Data-driven dashboards** – income/expense summary, category pie chart, trend line chart, and top-spend list driven by SQL queries (no AI calls).
- 🗂️ **Admin-grade history** – month/category/type filters, user filter for admins, inline editing for date/amount/category/note, and deletion support.
- 🐳 **Production ready** – Prisma schema & migration, Dockerfile + docker-compose, `.env.example`, Tailwind styling, SWR data layer, Chart.js visualizations, and OpenAI key isolation on the server.

## Tech Stack
- **Frontend/Backend**: Next.js 14 App Router, React 18, SWR, TailwindCSS.
- **Database**: PostgreSQL 15 with Prisma ORM.
- **AI**: OpenAI Responses API with Structured Outputs JSON Schema.
- **Charts**: `react-chartjs-2` / Chart.js.
- **Auth**: Custom session cookies + Prisma sessions table.
- **Containerization**: Dockerfile + Compose orchestrating `web` and `postgres` services.

## Architecture Overview
```
┌────────────┐  chat input         ┌───────────────┐  structured fields  ┌──────────────┐
│ Next.js UI │ ───────────────────▶│ API Route     │────────────────────▶│ PostgreSQL    │
│  (App dir) │                     │ Handlers      │                     │ (Prisma ORM)  │
└─────▲──────┘                     │  (server)     │◀──SQL charts/feeds──┴──────▲───────┘
      │                            └──────┬────────┘                        │
      │             SWR fetcher + cookies │                                 │
      │                                    │                                │
      │                                    ▼                                │
      │                             OpenAI Responses (Structured JSON)      │
      └─────────────────────────────────────────────────────────────────────┘
```
- AI is invoked only inside `/api/transactions` after the backend has parsed the numeric amount and deduced direction.
- All dashboard endpoints (`/api/stats/*`) perform SQL-only aggregations; no AI usage beyond ingestion.
- Session cookies store opaque tokens hashed with `SESSION_SECRET`, pointing to the Prisma `Session` table.

## Feature Overview
- **Chat-first ingestion** – `components/chat-input.tsx` provides a multiline text area that accepts natural-language entries such as `kopi 18k` or newline-separated batches. `app/api/transactions/route.ts` validates the payload with Zod, splits each line, parses the amount + direction via `lib/parsing.ts`, then calls `lib/openai.ts` for category/source/tags before persisting through Prisma. The save handler revalidates the SWR keys powering the dashboard.
- **Transaction workspace** – `/transactions` renders `components/transactions/transactions-view.tsx`, a client component with filters for range (month/year/lifetime), month/year pickers, category, type, and an admin-only user dropdown fed by `/api/users`. Inline editing hits `/api/transactions/[id]` to patch date, amount, category, or note, while the delete action removes recent records with permission guards.
- **Dashboards & insights** – The overview page combines `DashboardSummary`, `CategoryChart`, `SpendingTrend`, `RecentTransactions`, and `TopExpenses`. Each component consumes `/api/stats/summary`, `/api/stats/by-category`, `/api/stats/trend`, `/api/stats/top-expenses`, or `/api/transactions?limit=20`, creating an AI-free, SQL-driven set of cards and charts via Chart.js + SWR.
- **Role-aware access** – `lib/auth.ts` enforces username/password login, bcrypt hashing, and 7-day session cookies. Members may only query their own transactions, while admins can apply the `userId` filter, list users, and see all history. Nav pills adapt automatically through `components/dashboard-nav.tsx`.
- **API-first data layer** – Every UI surface talks to the same Next.js route handlers documented below, so automations can post chat-style text, edit transactions, or read stats using the identical JSON payloads surfaced to SWR.
- **Production readiness** – Prisma schema + migrations, Docker/Docker Compose, `.env.example`, Tailwind styling, and a centralized SWR fetcher in `components/providers.tsx` round out the stack. `lib/rate-limit.ts` throttles chat ingestion (5 requests per user per 15 seconds), and `lib/openai.ts` falls back to deterministic classifications whenever an API key is missing.

## Message Parsing & Classification
- **Amount tokens**: `k`, `rb`, `ribu` → ×1,000; `jt`, `juta`, `m` → ×1,000,000. Strings like `12.5k` or `1,5jt` are normalized.
- **Direction heuristics**: `salary`, `gaji`, `bonus` ⇒ income; `transfer`, `tf` ⇒ transfer; otherwise expense.
- **OpenAI schema** strictly enforces: `{ category, merchant, source, tags[], confidence }` with enums from the README. Missing API key falls back to deterministic defaults.

## Authentication & Roles
| Role   | Capabilities |
|--------|--------------|
| Admin  | Manage own data, view/edit all users' transactions, view dashboard for any user. |
| Member | Manage and view only their own transactions. |

First registered account becomes admin automatically. Sessions expire after 7 days.

## API Surface
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create user (first user = admin) and session cookie. |
| POST | `/api/auth/login` | Validate credentials and create session. |
| POST | `/api/auth/logout` | Destroy session token. |
| GET  | `/api/transactions` | List transactions with month/category/type/user filters. |
| POST | `/api/transactions` | Chat input → parse amount/direction → AI classify → persist. |
| PATCH/DELETE | `/api/transactions/:id` | Inline editing and deletion with permission checks. |
| GET  | `/api/stats/summary` | Monthly totals + count. |
| GET  | `/api/stats/by-category` | Expense aggregation for pie chart. |
| GET  | `/api/stats/trend` | Daily/weekly trend of income vs expense. |
| GET  | `/api/stats/top-expenses` | Largest 10 expenses. |
| GET  | `/api/users` | Admin-only list of users for filters targeting. |
| GET  | `/api/me` | Current user info.

## Environment Setup
### Requirements
- Node.js 20+
- npm (bundled with Node)
- Docker & Docker Compose (for Postgres/local production)
- OpenAI API key with access to `gpt-4.1-mini` or compatible responses model

### Environment Variables (`.env` or `.env.local`)
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/finance_ai?schema=public
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
SESSION_SECRET=change-me
```
Never expose the OpenAI key to the client (`NEXT_PUBLIC_*`).

### Local Development
1. **Install deps**: `npm install`.
2. **Start PostgreSQL**: `docker compose up -d postgres` (or use your own DB).
3. **Apply schema**: `npx prisma migrate dev`.
4. **Generate client** (optional if migrate already ran): `npx prisma generate`.
5. **Run dev server**: `npm run dev` → http://localhost:3000.
6. **Register first user** via `/register` (becomes admin). Subsequent users are members.

### Docker Compose
```
docker compose up --build
```
- `web` service builds the Next.js app, runs `next start` on port 3000.
- `postgres` stores persistent data in the `postgres-data` volume.
- Copy `.env.example` → `.env` prior to compose so both services share the same secrets.

## Project Structure
```
app/
  (auth)/{login,register}/       Auth pages
  (dashboard)/{layout,page,...}  Protected app experience
  api/                           Route handlers (auth, transactions, stats)
components/                      Client components (chat input, charts, tables)
lib/                             Auth helpers, parsing, OpenAI client, rate limiting, utils
prisma/                          Prisma schema + migrations
public/                          Static assets
```

## Development Commands
| Command | Purpose |
|---------|---------|
| `npm run dev` | Next.js dev server with hot reload.
| `npm run build` | Production build.
| `npm run start` | Start built server (used in Docker).
| `npm run lint` | ESLint via Next config.
| `npm run db:dev` | Prisma migrate dev.
| `npm run db:deploy` | Prisma migrate deploy (prod).
| `npm run db:generate` | Prisma client generation.

## Feature Deep Dive

### Chat-based transaction capture
- `components/chat-input.tsx` renders a multiline textarea with Enter-to-submit, Shift+Enter for newline, and inline status text. On success it clears the form and manually revalidates `/api/transactions?limit=20`, `/api/stats/summary`, `/api/stats/by-category`, `/api/stats/trend`, and `/api/stats/top-expenses` so the dashboard reflects the new rows instantly.
- `app/api/transactions/route.ts` validates the payload with `transactionMessageSchema`, enforces authentication, rate limits each user to five submissions per 15 seconds, and splits the message by blank lines so batch pastes create one row per entry.
- `lib/parsing.ts` handles Indonesian number formats (`k`, `rb`, `ribu`, `jt`, `juta`, `m`) plus decimal/comma separators, tidies the remaining text, and infers the direction (keywords such as `gaji` → income, `transfer` → transfer, otherwise expense) so every record arrives normalized before classification.
- `transactionMessageSchema` and `transactionUpdateSchema` keep text within 3–280 characters, force positive integer amounts, and constrain categories/dates before Prisma runs.
- `lib/openai.ts` calls OpenRouter/OpenAI with a JSON Schema that mirrors `lib/constants.ts` so categories, sources, and tags always match the allowed enums; when `OPENAI_API_KEY` is undefined the fallback classifier still produces a deterministic record (`Other`, `Transfer`, or `Salary / Income`) so ingestion never blocks.
- Each persisted record stores `rawMessage`, normalized `cleanNote`, AI metadata (`category`, `merchant`, `source`, `tags`, `aiConfidence`, `aiModel`, `aiVersion`), and timestamps as defined in `prisma/schema.prisma`, keeping downstream analyses deterministic and auditable.

### Transaction history workspace
- `/transactions` merges URL `searchParams` (range, month, year, direction, category, userId) into default state so deep links reopen the same slice of data.
- `components/transactions/transactions-view.tsx` renders the filter grid (range selector, `<input type="month">`, `<input type="number">` year picker, category/type dropdowns, admin-only user dropdown sourced from `/api/users`) and composes the `/api/transactions` query string with `limit=200`.
- `/api/transactions` `GET` applies the filters, restricts non-admins to their own `userId`, caps the result set at 200 rows, and returns each transaction alongside the owning user for admin auditing.
- Inline editing swaps table cells for inputs, keeps values in local state, and persists via PATCH `/api/transactions/[id]`, which reuses `transactionUpdateSchema` (positive amount, valid category, trimmed note, ISO date) and disallows edits/deletes from non-owners.
- `components/recent-transactions.tsx` fetches `/api/transactions?limit=20`, formats the output with `date-fns` + `formatCurrency`, exposes a delete button guarded by `confirm()`, and revalidates its SWR cache after removal.

### Dashboards & insights
- `app/(dashboard)/page.tsx` orchestrates ChatInput, DashboardSummary, CategoryChart, SpendingTrend, RecentTransactions, and TopExpenses inside a responsive grid for the default route.
- `/api/stats/summary` returns the selected month, total income, total expense, net, and row count; `/api/stats/by-category` performs a Prisma `groupBy` over expense categories; `/api/stats/trend` produces daily buckets for the last 30 days (or 12 weekly buckets when `resolution=weekly`); `/api/stats/top-expenses` returns the top 10 expenses for the current or requested month. Admins can pass `userId`, everyone else is scoped automatically.
- Chart components adapt those JSON payloads with Chart.js via `react-chartjs-2`, while `TopExpenses` lists the biggest spends and `RecentTransactions` highlights the latest activity. SWR caching (configured in `components/providers.tsx`) keeps the UI responsive without redundant fetches.

### Roles, authentication, and sessions
- `app/(auth)/login` and `app/(auth)/register` protect themselves with `getCurrentUser`, then render `components/auth-form.tsx`. The form posts JSON to `/api/auth/login` or `/api/auth/register`, handles errors inline, and redirects on success.
- `/api/auth/register` lowercases usernames, enforces uniqueness, promotes the very first account to `admin`, hashes passwords with bcrypt, and creates a session. `/api/auth/login` verifies credentials and issues a new token, and `/api/auth/logout` destroys it.
- `lib/auth.ts` manages the `finance_session` cookie, hashes tokens with `SESSION_SECRET`, stores them inside the Prisma `Session` table with a 7-day TTL, and exposes helpers (`getCurrentUser`, `requireUser`, `requireAdmin`, `destroySession`) used throughout layouts and route handlers.
- `/api/me` provides `{ id, username, role }` for clients that need to display current-user info, and `/api/users` gives admins an ordered list of users for the transaction filter dropdown.
- `app/(dashboard)/layout.tsx` wraps the authenticated experience, calls `requireUser`, prints the username + role, and wires the `LogoutButton` to `/api/auth/logout`.

### API + integration surface
- Route handlers under `app/api/**` map 1:1 with the API Surface table above—`/api/transactions` for listing/creating, `/api/transactions/[id]` for patch/delete, `/api/stats/*` for analytics, `/api/users` for admin filters, and `/api/me` for identity.
- Each handler relies on Prisma for persistence and Zod schemas for validation, ensuring external clients receive the same error messages and structure as the SWR-powered UI.
- `components/providers.tsx` registers a global SWR fetcher that throws on HTTP errors, disables focus-based revalidation, and keeps typing strict via the definitions in `types/index.ts`.

### Safeguards & deployment
- `lib/rate-limit.ts` enforces basic throttling for ingestion (five submissions per user every 15 seconds) to prevent accidental duplication and manage AI usage.
- `.env.example` documents `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, and `SESSION_SECRET`, while `docker-compose.yml` pairs the Next.js app (`web`) with a Postgres 15 service (`postgres`) that shares those env vars.
- Prisma models (`User`, `Session`, `Transaction`) include cascading relations and indexes on `(userId, occurredAt)` and `category` for fast, deterministic SQL queries backing the dashboards.
- Standard npm scripts (`npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run db:*`) work across environments, and the TailwindCSS + Chart.js frontend mirrors production behaviour locally.
