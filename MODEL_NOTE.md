# Finance AI — Model Selection (omniroute gateway)
#
# The gateway's model namespace is gated by provider credentials:
#   - `cline/*` and `opencode/*` require active credentials for the cline/opencode provider.
#     Without them the gateway returns 404 "No active credentials for provider: cline".
#   - `auto/*` models route to available providers automatically and work without extra creds.
#
# Current config: `OPENAI_MODEL=opencode/deepseek-v4-flash-free` → gateway resolves to
#   `cl/deepseek/deepseek-v4-flash` under the cline provider → 404 without cline creds.
#
# WORKING models (tested directly against the gateway, returns valid JSON):
#   - auto/best-chat  → classifies rokok→Entertainment, minum→Food & Drink correctly (tiny prompt)
#   - auto/cheap      → same correct classification, lower latency
#
# RECOMMENDED: switch OPENAI_MODEL to `auto/best-chat` (good quality, works without cline creds).
#   ALTERNATIVE: `auto/cheap` if cost/latency is the priority.
#
# To switch:
#   1. Edit OPENAI_MODEL in .env to the chosen auto/* model
#   2. Rebuild + redeploy (docker compose build web && docker compose up -d --no-deps web)
#   3. Verify: POST a test transaction and check category ≠ Other
#
# TEST PROMPT (minimal repro):
#   system: "Return ONLY valid JSON. category: Food & Drink, Groceries, Entertainment, Other.
#            rokok→Entertainment. minum→Food & Drink."
#   user:   "Amount: 26000. Direction: expense. Note: Rokok"
#   expect: {"category": "Entertainment"}
#
# KNOWN GATED models (return 404 "No active credentials for provider: cline"):
#   - cl/deepseek/deepseek-v4-flash
#   - cline/qwen/qwen3.6-plus
#   - cl/poolside/laguna-s-2.1
#   - cl/deepseek/deepseek-v4-pro-0813
#   - opencode/deepseek-v4-flash-free  (resolves to cl/deepseek/deepseek-v4-flash)
#
# The finance-ai prompts in lib/openai.ts already contain correct category guardrails
# (rokok→Entertainment, minum→Food & Drink, jajan→Food & Drink, etc.) — the issue
# is purely that the configured model is unreachable due to missing cline provider creds,
# so the route falls back to `fallbackClassification()` which returns `Other` for expenses.
