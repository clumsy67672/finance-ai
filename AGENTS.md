# Repository Guidelines

## Product Overview
- Chat-style ingestion: `components/chat-input.tsx` posts newline-separated natural-language entries to `/api/transactions`, where `lib/parsing.ts` normalizes numbers (k/rb/jt/juta/m) and `lib/openai.ts` classifies category/source/tags with Structured Outputs plus a rate limit of 5 saves per 15 seconds.
- Transactions workspace: `/transactions` hosts `components/transactions/transactions-view.tsx` with range/month/year/category/type filters plus an admin-only user dropdown from `/api/users`. Inline edits and deletions go through `/api/transactions/[id]` with Zod validation and permission checks.
- Dashboards: The overview combines ChatInput, DashboardSummary, CategoryChart, SpendingTrend, RecentTransactions, and TopExpenses. These components read `/api/stats/summary`, `/api/stats/by-category`, `/api/stats/trend`, `/api/stats/top-expenses`, and `/api/transactions?limit=20`, all powered by SQL-only aggregations for Chart.js visualizations.
- Roles & auth: `/api/auth/{register,login,logout}` plus `lib/auth.ts` implement bcrypt-hashed credentials, 7-day session cookies, and role-based access (first user = admin). Admins can filter by `userId` and query `/api/users`; members are restricted to their own data.
- API-first design: Every UI call uses the documented JSON endpoints (`/api/transactions`, `/api/transactions/[id]`, `/api/stats/*`, `/api/users`, `/api/me`), making automation straightforward. SWR is configured in `components/providers.tsx` to talk to these handlers directly.
- Production setup: Prisma schema + migrations, Docker/Docker Compose, `.env.example`, TailwindCSS, Chart.js, and OpenAI Structured Outputs via OpenRouter keep behaviour consistent between local dev and production while keeping secrets server-side.

## Project Structure & Module Organization
Next.js App Router code lives in `app/`, organized by routed folders like `(auth)` and `(dashboard)`, while reusable UI sits in `components/`. Server-only helpers, OpenAI wrappers, and parsing utilities belong in `lib/`, and shared types live in `types/`. Database schema and migrations reside in `prisma/`, with generated assets ignored from VCS. Container definitions (`Dockerfile`, `docker-compose.yml`) launch the `web` and `postgres` services.

## Build, Test, and Development Commands
Use `npm run dev` for hot-reloading local work and `npm run build` followed by `npm run start` to simulate production. Linting is enforced with `npm run lint` (Next.js + ESLint rules). Prisma workflows: `npm run db:dev` to create or update the schema locally, `npm run db:generate` to refresh the client after schema edits, and `npm run db:deploy` when applying migrations in staging/production. Spin up Postgres quickly with `docker compose up -d postgres`.

## Coding Style & Naming Conventions
Stick to TypeScript with ES modules, 2-space indentation, and prefer async/await over promise chains. Client components use PascalCase filenames (e.g., `components/TransactionList.tsx`), server helpers use camelCase exports, and environment-aware utilities belong in `lib/server`. Run `npm run lint` before opening a PR; it will enforce `eslint-config-next` conventions and highlight forbidden server-client crossings.

## Testing Guidelines
While no automated test suite ships yet, add unit tests beside critical utilities (`lib/__tests__/*.test.ts`) using Vitest or Jest so they can run via `npx vitest`. When modifying parsers or Prisma queries, include regression scenarios covering localized number formats, role-based filtering, and unauthorized access paths. For UI, rely on Playwright stories scoped to the `app/(dashboard)` flows; ensure deterministic fixtures seeded via `prisma db seed`.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (`feat:`, `fix:`, `docs:`) with imperative subjects under 72 characters. Each PR should describe the motivation, link relevant issues, list affected routes or APIs, and attach screenshots/GIFs for UI-facing tweaks. Include database or environment changes in a "Deployment" checklist, note any new feature flags, and confirm lint + relevant tests passed locally.

## Security & Environment Notes
Never expose `OPENAI_API_KEY` or `SESSION_SECRET` to the client; only server code in `app/api` should read them. Use `.env.example` as the canonical template and keep secrets injected via the runtime or Compose overrides. Rate limiting and auth guards already exist—if you add new routes, ensure they consult the same helpers in `lib/auth` and reuse Prisma transactions for multi-step writes.
