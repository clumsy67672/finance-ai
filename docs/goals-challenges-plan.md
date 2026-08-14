# Goals & Challenges — Plan

## What We're Building

A **Goals & Challenges** page in finance-ai that tracks:

1. **Goals** — Things you're saving toward (emergency fund, marriage, etc.)
2. **Challenges** — Financial burdens/obligations that constrain your cash flow (mortgage, debt, etc.)

This gives you a single view of where your money needs to go and what's standing in the way.

---

## Database Schema

Two new models in `prisma/schema.prisma`:

```prisma
model Goal {
  id        String    @id @default(uuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String    @db.VarChar(200)
  note      String?   @db.VarChar(500)
  amount    Int       // target amount in rupiah
  saved     Int       @default(0) // current saved amount
  deadline  DateTime?
  achieved  Boolean   @default(false)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Challenge {
  id         String    @id @default(uuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  title      String    @db.VarChar(200)
  note       String?   @db.VarChar(500)
  amount     Int       // monthly obligation
  startDate  DateTime
  endDate    DateTime?
  active     Boolean   @default(true)
  severity   String    @default("high") // low | medium | high | critical
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}
```

Both linked to `User` with cascade delete.

---

## API Endpoints

### `/api/goals`
- **GET** — list all goals for current user
- **POST** — create new goal `{ title, note?, amount, deadline? }`
- **PATCH** `/api/goals/[id]` — update saved amount, mark achieved
- **DELETE** `/api/goals/[id]`

### `/api/challenges`
- **GET** — list all challenges for current user
- **POST** — create new challenge `{ title, note?, amount, startDate, endDate?, severity }`
- **PATCH** `/api/challenges/[id]` — update active status, dates, amount
- **DELETE** `/api/challenges/[id]`

---

## UI Components

### `components/goals-list.tsx`
- Lists all goals with progress bar (saved / amount)
- Shows deadline countdown
- "Add goal" inline form
- Mark as achieved button
- Edit saved amount

### `components/challenges-list.tsx`
- Lists all challenges with severity badge (color-coded)
- Shows monthly obligation and remaining duration
- Total monthly obligations summary at top
- Add/remove challenges

### `components/financial-snapshot.tsx`
- Combined view: total goals target, total challenge obligations, monthly gap
- Visual indicator: green if sustainable, red if over-committed

---

## Pages

### `app/(dashboard)/goals/page.tsx`
Full Goals & Challenges workspace:
- FinancialSnapshot at top
- Two columns: Goals | Challenges
- Add forms inline

---

## Navigation

Add `{ href: '/goals', label: 'Goals' }` to `NAV_ITEMS` in `app/(dashboard)/layout.tsx`

---

## Seed Data (Your Actual Goals)

Based on our conversation:

### Goals
| Goal | Target | Saved | Deadline |
|------|--------|-------|----------|
| Emergency Fund | Rp 20,000,000 | 0 | — |
| Marriage Fund | Rp 50,000,000 | 0 | TBD |

### Challenges
| Challenge | Amount | Start | Severity |
|-----------|--------|-------|----------|
| House Mortgage (full) | Rp 7,000,000/mo | 2027-01 | Critical |
| Sister contribution (gap) | Rp 3,500,000/mo | 2027-01 | Medium |
| Income target gap | Rp 2,500,000/mo | Now | High |

---

## Implementation Order

1. **Schema** — Add models, create migration
2. **API routes** — `/api/goals` and `/api/challenges` (CRUD)
3. **Components** — GoalsList, ChallengesList, FinancialSnapshot
4. **Page** — `app/(dashboard)/goals/page.tsx`
5. **Nav** — Add to NAV_ITEMS
6. **Seed** — Insert your actual goals/challenges via direct SQL
7. **Verify** — Build + lint + browser test

---

## Files Touched

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Goal + Challenge models |
| `prisma/migrations/*` | New migration |
| `app/api/goals/route.ts` | GET (list) + POST (create) |
| `app/api/goals/[id]/route.ts` | PATCH (update) + DELETE |
| `app/api/challenges/route.ts` | GET (list) + POST (create) |
| `app/api/challenges/[id]/route.ts` | PATCH (update) + DELETE |
| `components/goals-list.tsx` | Goals UI |
| `components/challenges-list.tsx` | Challenges UI |
| `components/financial-snapshot.tsx` | Combined overview |
| `app/(dashboard)/goals/page.tsx` | Full page |
| `app/(dashboard)/layout.tsx` | Add nav item |
