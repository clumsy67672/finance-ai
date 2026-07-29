# Graph Report - finance-ai  (2026-07-29)

## Corpus Check
- 59 files · ~15,001 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 355 nodes · 546 edges · 19 communities (13 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1f22e312`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getCurrentUser
- transactions-view.tsx
- openai.ts
- compilerOptions
- dependencies
- hermes_worker.py
- devDependencies
- Family Finance Chat Ledger
- csv-mapping.ts
- Design: Async Queue + OmniRoute Worker for Finance AI
- scripts
- layout.tsx
- Repository Guidelines
- layout.tsx
- extends
- next.config.mjs
- next-env.d.ts
- postcss.config.js
- tailwind.config.ts

## God Nodes (most connected - your core abstractions)
1. `getCurrentUser()` - 39 edges
2. `compilerOptions` - 18 edges
3. `Family Finance Chat Ledger` - 12 edges
4. `Settings` - 10 edges
5. `formatCurrency()` - 9 edges
6. `process_batch()` - 9 edges
7. `Design: Async Queue + OmniRoute Worker for Finance AI` - 9 edges
8. `classifyTransaction()` - 8 edges
9. `parseChatMessage()` - 8 edges
10. `scripts` - 8 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getCurrentUser()`  [EXTRACTED]
  app/api/transactions/route.ts → lib/auth.ts
- `LoginPage()` --calls--> `getCurrentUser()`  [EXTRACTED]
  app/(auth)/login/page.tsx → lib/auth.ts
- `RegisterPage()` --calls--> `getCurrentUser()`  [EXTRACTED]
  app/(auth)/register/page.tsx → lib/auth.ts
- `DashboardLayout()` --calls--> `requireUser()`  [EXTRACTED]
  app/(dashboard)/layout.tsx → lib/auth.ts
- `TransactionsPage()` --calls--> `requireUser()`  [EXTRACTED]
  app/(dashboard)/transactions/page.tsx → lib/auth.ts

## Import Cycles
- None detected.

## Communities (19 total, 6 thin omitted)

### Community 0 - "getCurrentUser"
Cohesion: 0.08
Nodes (35): POST(), POST(), POST(), GET(), batchUpdateSchema, PATCH(), GET(), PATCH() (+27 more)

### Community 1 - "transactions-view.tsx"
Cohesion: 0.08
Nodes (27): getParam(), PageProps, resolveInitialFilters(), TransactionsPage(), CategoryChart(), COLORS, SpendingTrend(), ChatInput() (+19 more)

### Community 2 - "openai.ts"
Cohesion: 0.09
Nodes (34): batchTransactionSchema, POST(), GET(), POST(), TRANSACTION_CATEGORIES, TRANSACTION_DIRECTIONS, TRANSACTION_SOURCES, TransactionCategory (+26 more)

### Community 3 - "compilerOptions"
Cohesion: 0.06
Nodes (30): **/*.cjs, DOM, DOM.Iterable, ESNext, **/*.mjs, next-env.d.ts, .next/types/**/*.ts, node_modules (+22 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (29): bcryptjs, chart.js, clsx, csv-parse, date-fns, next, openai, @openrouter/sdk (+21 more)

### Community 5 - "hermes_worker.py"
Cohesion: 0.15
Nodes (26): Any, _build_headers(), call_omni_parse(), fetch_pending_queue(), load_dotenv(), main(), mark_queue_items_error(), parse_args() (+18 more)

### Community 6 - "devDependencies"
Cohesion: 0.09
Nodes (23): autoprefixer, eslint, eslint-config-next, devDependencies, autoprefixer, eslint, eslint-config-next, postcss (+15 more)

### Community 7 - "Family Finance Chat Ledger"
Cohesion: 0.09
Nodes (22): API + integration surface, API Surface, Architecture Overview, Authentication & Roles, Chat-based transaction capture, Dashboards & insights, Development Commands, Docker Compose (+14 more)

### Community 8 - "csv-mapping.ts"
Cohesion: 0.22
Nodes (18): CsvMappingGuess, detectAmountColumn(), detectDateColumn(), detectDescriptionColumn(), detectTypeColumn(), DIRECTION_KEYWORDS, inferCsvMapping(), inferCsvMappingHeuristics() (+10 more)

### Community 9 - "Design: Async Queue + OmniRoute Worker for Finance AI"
Cohesion: 0.15
Nodes (12): 1. Overview, 2. Architecture, 3. Database Changes (Prisma), 4. API Endpoints, 5. UI Changes, 6. Worker Script (Python), 7. Docker & Deployment, 8. Implementation Order (+4 more)

### Community 10 - "scripts"
Cohesion: 0.15
Nodes (12): description, name, scripts, build, db:deploy, db:dev, db:generate, dev (+4 more)

### Community 11 - "layout.tsx"
Cohesion: 0.24
Nodes (6): DashboardLayout(), NAV_ITEMS, NavItem, LogoutButton(), requireAdmin(), requireUser()

### Community 12 - "Repository Guidelines"
Cohesion: 0.22
Nodes (8): Build, Test, and Development Commands, Coding Style & Naming Conventions, Commit & Pull Request Guidelines, Product Overview, Project Structure & Module Organization, Repository Guidelines, Security & Environment Notes, Testing Guidelines

## Knowledge Gaps
- **134 isolated node(s):** `next/core-web-vitals`, `NAV_ITEMS`, `PageProps`, `statusUpdateSchema`, `batchUpdateSchema` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getCurrentUser()` connect `getCurrentUser` to `openai.ts`, `layout.tsx`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `TRANSACTION_CATEGORIES` connect `openai.ts` to `transactions-view.tsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `next/core-web-vitals`, `NAV_ITEMS`, `PageProps` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getCurrentUser` be split into smaller, more focused modules?**
  _Cohesion score 0.07878787878787878 - nodes in this community are weakly interconnected._
- **Should `transactions-view.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07751937984496124 - nodes in this community are weakly interconnected._
- **Should `openai.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09291521486643438 - nodes in this community are weakly interconnected._