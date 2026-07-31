# Frontend UI/UX Enhancements & AI Parsing Guardrails

> Finance-ai dashboard: make data actionable, not just pretty charts.
> Applies to the Next.js + TailwindCSS frontend under `components/` and the
> AI parsing prompts in `lib/openai.ts`.

## 1. AI Insight Banner (Top Priority)

**Placement:** immediately below the Income | Expense | Net summary cards
(`components/dashboard-summary.tsx`).

**Design:** a sleek, rounded banner whose accent color follows the LLM's
`status_kesehatan` output:

| status_kesehatan | Color  |
|------------------|--------|
| `Sehat`          | green  |
| `Waspada`        | amber  |
| `Kritis`         | red    |

**Content:**
- `analisa_utama` rendered bold
- Bulleted list of `rekomendasi_aksi`

**UX:** the local LLM takes seconds, so:
1. Render a **"Generate Insights"** button with a loading spinner.
2. Cache the generated JSON in PostgreSQL (`InsightCache` table) so a repeat
   visit loads instantly — cache key includes userId + month, regenerated on
   demand.

**API:** `GET /api/insights?month=YYYY-MM` (auth required). Reads cache first;
if missing/expired, returns `{ cached: false }` and the client POSTs to the
same route to trigger generation. Response shape:

```json
{
  "status_kesehatan": "Sehat" | "Waspada" | "Kritis",
  "analisa_utama": "string",
  "rekomendasi_aksi": ["string", "..."]
}
```

## 2. Needs vs. Wants Progress Bar

**Placement:** dashboard, alongside the category chart.

**Design:** a single horizontal stacked progress bar with two segments and a
legend (Needs = slate-900, Wants = amber-400).

**Logic:** bucket existing SQL category totals:

- **Needs** — Groceries, Fuel / Gas, Loan / Debt, Transport, Utilities,
  Internet & Mobile, Household Needs, Health, Insurance, Education, Taxes /
  Fees, Vehicle Maintenance
- **Wants** — Food & Drink, Entertainment, Sports / Outdoor, Online Shopping,
  Subscriptions, Clothing, Self Care, Family / Gifts, Pets, Donations /
  Charity

**Visual:** "Rp 2.2M Needs · Rp 1.1M Wants" with percentages — clearer picture
of financial discipline than a 10-slice donut.

**API:** `GET /api/stats/needs-wants` — sums `Needs` vs `Wants` for the month,
same auth scoping as `/api/stats/summary`.

## 3. Monthly Pacing / Burn Rate Indicator

**Placement:** below the summary cards, next to the insight banner.

**Logic:** compare month-to-date spending against the calendar. Compute the
"healthy" fraction of the budget spent by today: `dayOfMonth / daysInMonth`.
If actual spend % exceeds the pacing % by a margin (e.g. >15 pts), the
indicator turns red ("ahead of pace") — otherwise green/neutral.

Example: July 31, spending Rp 3.3M of Rp 9.4M income → excellent. July 10,
spending Rp 3M → red warning.

**API:** extends `GET /api/stats/summary` with:

```json
{
  "pacing": {
    "spent": 3300000,
    "income": 9400000,
    "expectedByToday": 3032258,
    "pacingPercent": 105,
    "overPace": false
  }
}
```

## 4. AI Parsing Prompt Guardrails (lib/openai.ts)

Both prompts (`classifyPrompt` and `parseTransactions`) must enforce:

### Category Guardrails (explicit, non-negotiable)
- `rokok`, `sigaret` → `Entertainment` (NOT Food & Drink)
- `ayam` (whole chicken / meat) → `Groceries`
- `ayam goreng` / cooked food → `Food & Drink`
- `jajan`, `gorengan`, `bakso`, `pentol` → `Food & Drink`
- `bensin`, `pertalite`, `pertamax` → `Fuel / Gas`
- `indomaret`, `alfamart` → `Groceries`
- `servis`, `service` → `Self Care`

Without these, small local models randomly flip groceries↔food or assign
`rokok` to whatever category it last saw.

### Number Normalization Rules (crash prevention)
- `k` / `rb` / `ribu` = `1000` → return **integer** `40000`, never `"40k"`
- `jt` / `juta` / `m` = `1000000`
- **Always** return a bare integer for `amount` — a string like `"40k"`
  would crash the Prisma `Int` schema.

### Note Sanitization (new in v1.3.0)
- `sanitizeAiNote()` rejects non-Latin scripts (Thai/Lao/CJK/…) the 3B model
  hallucinates under JSON pressure.
- `deriveNoteFromRaw()` rebuilds the note from the raw message when the AI
  note is garbage — amount + source keywords stripped, capitalized.

## 5. Files touched

| File | Change |
|------|--------|
| `docs/frontend-improvements.md` | this document |
| `prisma/schema.prisma` | `InsightCache` model |
| `prisma/migrations/*` | migration for cache table |
| `app/api/insights/route.ts` | GET/POST insight generation |
| `app/api/stats/needs-wants/route.ts` | needs/wants buckets |
| `app/api/stats/summary/route.ts` | + pacing object |
| `components/insight-banner.tsx` | banner w/ spinner + cache |
| `components/needs-wants-bar.tsx` | stacked progress bar |
| `components/monthly-pacing.tsx` | burn-rate indicator |
| `app/(dashboard)/page.tsx` | wire new components |
| `lib/openai.ts` | guardrails + normalization |
| `lib/constants.ts` | AI_VERSION bump |
