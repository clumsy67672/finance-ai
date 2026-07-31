# Family Finance Chat Ledger - AI Development Guide

This document outlines the architectural guidelines, prompts, and code structures required to integrate a local Qwen LLM into the Next.js App Router expense tracker.

## 1. Local AI Infrastructure
Since the environment runs on a local Ubuntu server using Docker, the application bypasses external cloud APIs.
- **SDK:** Use the standard `openai` npm package (or plain `fetch` against `/v1/chat/completions`).
- **Gateway:** Point the `baseURL` to the local gateway (e.g., `http://host.docker.internal:11434/v1`).
- **Authentication:** Pass a dummy API key (`sk-local` / `local-no-key-required`).
- **Temperature:** Keep `temperature: 0.1` for strict JSON outputs.

**Actual implementation notes (finance-ai):**
- `lib/openai.ts` → `callOmniRoute()` posts to `${OPENAI_BASE_URL}/chat/completions`, handles both SSE streams and non-streamed OpenAI JSON envelopes.
- `OPENAI_BASE_URL=http://host.docker.internal:11434/v1`, `OPENAI_MODEL=qwen2.5:3b` in `.env`.
- Note sanitizer: `sanitizeAiNote()` rejects non-Latin script hallucinations (Thai/Lao/CJK); `deriveNoteFromRaw()` rebuilds the note from the raw message when the AI output is garbage.

---

## 2. Data Ingestion: Advanced Parsing (Few-Shot)
To handle multiple items in a single chat input (e.g., "Ayam 24k, bensin sonic 40k, pentol 10k"), the parser must return a **JSON Array**.

### System Prompt (Transaction Parser)
```text
Anda adalah API ekstraksi data keuangan. Tugas Anda adalah mengekstrak teks alami menjadi Array of JSON Objects.

ATURAN KATEGORI (HANYA GUNAKAN INI):
- "Food & Drink" (jajan, pentol, kopi, gorengan)
- "Groceries" (bahan mentah, ayam, sosis, sayur, minimarket)
- "Fuel / Gas" (bensin, pertamax)
- "Transport" (parkir, tol)
- "Entertainment" (rokok, langganan aplikasi)
- "Loan / Debt" (pinjaman, paylater, bayar utang)
- "Sports / Outdoor" (badminton, shuttlecock, naik gunung)
- "Internet & Mobile" (paket data, pulsa)
- "Other"

ATURAN EKSTRAKSI:
1. Pisahkan item jika terdapat lebih dari satu pengeluaran.
2. Konversi singkatan angka: "k" atau "rb" = +000. "jt" = +000000.
3. OUTPUT WAJIB BERUPA JSON ARRAY, TANPA TEKS LAIN, TANPA MARKDOWN.

CONTOH:
Input: "Ayam mentah 100rb trus beli bensin buat sonic 40k"
Output:
[
  {"nama_item": "Ayam mentah", "kategori": "Groceries", "jumlah": 100000},
  {"nama_item": "Bensin Sonic", "kategori": "Fuel / Gas", "jumlah": 40000}
]
```

### Backend Implementation (`app/api/transactions/route.ts`)
- Use `zod` to validate the LLM output strictly: `z.array(z.object({ nama_item: z.string(), kategori: z.string(), jumlah: z.number() }))`.
- Clean the LLM output using `.replace(/```json|```/g, '')` before `JSON.parse()`.
- Use `prisma.transaction.createMany()` to batch insert the parsed array.

**Actual implementation notes (finance-ai):**
- `lib/openai.ts` → `parseTransactions()` sends the raw message to the LLM with strict guardrails:
  - **Number normalization:** `amount` must ALWAYS be a bare integer — `40k → 40000`, `1.5jt → 1500000`, `3m → 3000000` (prevents Prisma `Int` schema crash).
  - **Category guardrails:** `rokok/sigaret/twiz → Entertainment`; raw `ayam mentah/daging → Groceries`; cooked `ayam goreng/crispy → Food & Drink`; `indomaret/alfamart → Groceries`; `bensin/pertalite → Fuel / Gas`; `badminton/shuttlecock/naik gunung → Sports / Outdoor`; `servis → Self Care`; `bayar utang/paylater/kredivo → Loan / Debt`; `gaji/salary → Salary / Income`.
  - Splits on transition words (`terus, lalu, lanjut`) and amount boundaries.
- `AI_VERSION` bumped on every prompt change (currently `v1.4.0`).
- Local fallback: if the LLM fails, `parseChatMessage()` splits lines and `classifyTransaction()` re-runs a per-item classifier.

---

## 3. Data Analysis: Monthly Insights
Instead of processing all raw transactions, the backend must aggregate the data via SQL first and send a lightweight summary to the local LLM.

### System Prompt (Financial Advisor)
```text
Anda adalah penasihat keuangan keluarga yang analitis, tegas, dan logis. Anda akan menerima ringkasan data pengeluaran bulanan dalam format JSON.

Tugas Anda:
1. Evaluasi arus kas dan rasio pendapatan terhadap pengeluaran.
2. Identifikasi anomali, pemborosan, atau beban hutang yang terlalu tinggi.
3. Berikan 3 rekomendasi tindakan yang realistis.

Anda WAJIB merespons HANYA dengan objek JSON yang valid menggunakan skema persis seperti di bawah ini, tanpa teks pembuka, penutup, atau format markdown:
{
  "status_kesehatan": "Sehat" | "Waspada" | "Kritis",
  "analisa_utama": "Satu kalimat ringkasan kondisi keuangan.",
  "kebocoran_dana": ["item 1", "item 2"],
  "rekomendasi_aksi": ["aksi 1", "aksi 2", "aksi 3"]
}
```

### Expected Payload from Next.js to LLM
```json
{
  "bulan": "Juli 2026",
  "total_pendapatan": 9470000,
  "total_pengeluaran": 3366814,
  "sisa_bersih": 6103186,
  "top_kategori": [
    {"kategori": "Pinjaman / Hutang", "jumlah": 2024863},
    {"kategori": "Olahraga / Hobi", "jumlah": 389173}
  ]
}
```

**Actual implementation notes (finance-ai):**
- `app/api/insights/route.ts` → `GET` reads `InsightCache` (keyed `userId + month`), `POST` generates + upserts.
- `status_kesehatan` is computed **deterministically server-side** from spend/income ratio (≤50% Sehat, ≤80% Waspada, else Kritis) — the 3B model is unreliable for labels. The LLM only writes `analisa_utama` + `rekomendasi_aksi`.
- Dashboard widget: `components/insight-banner.tsx` (green/amber/red banner, Generate Insights button + spinner).

---

## 4. Frontend Enhancements (Dashboard)

### `AIInsightBanner.tsx`
- **Purpose:** Displays the result of the Financial Advisor LLM prompt.
- **Behavior:** "Generate Insights" button. Loading state while the local LLM processes. Dynamic Tailwind colors based on `status_kesehatan` (Green=Sehat, Yellow=Waspada, Red=Kritis).
- **Actual:** `components/insight-banner.tsx`, caches via `/api/insights`.

### `NeedsWantsBar.tsx`
- **Purpose:** Replaces complex pie charts with an actionable horizontal progress bar.
- **Logic:** Groups categories into `Needs` (Groceries, Fuel / Gas, Loan / Debt, Transport, Utilities, Internet & Mobile, Household Needs, Health, Insurance, Education, Taxes / Fees, Vehicle Maintenance) and `Wants` (Food & Drink, Entertainment, Sports / Outdoor, Online Shopping, Subscriptions, Clothing, Self Care, Family / Gifts, Pets, Donations / Charity). Others → `Other`.
- **Actual:** `components/needs-wants-bar.tsx` + `app/api/stats/needs-wants/route.ts`.

### `MonthlyPacing.tsx`
- **Purpose:** Burn-rate indicator. Compares month-to-date spend against the calendar fraction of income. Turns red when >15% over pace.
- **Actual:** `components/monthly-pacing.tsx`; pacing computed inside `app/api/stats/summary/route.ts`.

---

## 5. Runway & Forecast Engine (Ramalan Pengeluaran)

> A historical dashboard tells you what you did; forecasting tells you what to do next.

### 5.1 The Math: Daily Burn Rate (Backend, no AI)
Formula: `(Total Spent So Far / Current Day of Month) * Total Days in Month`

Example: by Aug 15 you've spent Rp 1.500.000 → daily burn Rp 100.000 → projected Rp 3.100.000 by Aug 31.

### 5.2 The AI Forecast: Contextual Prediction
Math gives a flat projection; the LLM adds pattern awareness (weekend spikes, routines, family needs).

**System Prompt (Forecaster):**
```text
Anda adalah analis risiko keuangan. Anda akan menerima data pengeluaran saat ini, proyeksi matematis hingga akhir bulan, dan pola pengeluaran rutin pengguna.

Tugas Anda:
1. Analisa apakah pengguna akan overbudget di akhir bulan berdasarkan pola yang ada.
2. Identifikasi pengeluaran rutin mana yang paling membebani sisa budget.
3. Berikan 1 kalimat peringatan atau saran taktis agar sisa dana cukup hingga gajian berikutnya.

Anda WAJIB merespons HANYA dengan objek JSON yang valid menggunakan skema berikut:
{
  "status_proyeksi": "Aman" | "Waspada" | "Defisit",
  "estimasi_pengeluaran_akhir": angka (integer),
  "pesan_prediksi": "Satu kalimat peringatan/saran prediksi."
}
```

**User Prompt (Dynamic Payload from Next.js API):**
```json
{
  "tanggal_analisa": "15 Agustus 2026",
  "sisa_hari_bulan_ini": 16,
  "budget_bulanan": 5000000,
  "pengeluaran_saat_ini": 2800000,
  "proyeksi_matematis_akhir_bulan": 5786000,
  "pola_rutin_terdeteksi": [
    "Jadwal rutin bulu tangkis (Senin & Sabtu): estimasi sisa Rp 160.000",
    "Bensin & perawatan motor (Honda Sonic): estimasi sisa Rp 150.000",
    "Belanja harian (Kebutuhan rumah 4 orang): estimasi sisa Rp 1.500.000"
  ]
}
```

**Actual implementation (finance-ai):**
- `app/api/stats/forecast/route.ts` — computes the math projection server-side, derives routine patterns from SQL (top categories by frequency), calls the LLM with the payload above, returns `{ status_proyeksi, estimasi_pengeluaran_akhir, pesan_prediksi, proyeksi_matematis }`.
- `status_proyeksi` is decided deterministically by comparing `estimasi_pengeluaran_akhir` vs budget; the LLM only provides `pesan_prediksi` + its own estimate, which is clamped to a sane range.
- `components/runway-forecast.tsx` — runway progress bar: filled = spend so far, dotted extension = AI end-of-month estimate, red vertical marker = budget line. Turns amber/red when the projection crosses the budget.

### 5.3 Frontend UI: The Runway Progress Bar
On the dashboard, under the monthly summary, a "Runway" visual:
- Filled portion = `pengeluaran_saat_ini`
- Dotted extension = AI's `estimasi_pengeluaran_akhir`
- Red vertical line at `budget_bulanan`
- If the dotted line crosses the budget line, forecast text turns amber/red.

By feeding the model routine patterns (court fees every Mon & Sat, motor fuel), the AI gives surgical advice like "You only have Rp 500k left for 15 days; after groceries and gas for the Sonic, pause all other discretionary spending."

---

## 6. Future Automation (n8n Integration)
- Create a dedicated endpoint: `/api/cron/weekly-summary`.
- Trigger via an n8n webhook running on the local Ubuntu server every Sunday.
- n8n fetches the AI-generated JSON summary and forwards it as a formatted message to WhatsApp/Telegram.

---

## 7. Operational Notes
- **Backups:** the real DB lives in the external Docker volume `finance-ai-pg` (`finance` / `7wu394pejCknEgaFIXXkwbJp`). Never `docker compose down -v`. All migrations are append-only.
- **Ports:** web on `4000`, Postgres `5432`, Ollama `11434` (host). Container reaches host via `host.docker.internal` (`extra_hosts` in compose).
- **Prisma:** always `npx prisma generate` in the running container after a schema change, then `npx prisma migrate deploy`.
- **AI_VERSION:** bump in `lib/constants.ts` whenever prompts change.
