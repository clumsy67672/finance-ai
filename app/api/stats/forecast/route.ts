import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { callOmniRoute } from '@/lib/openai';
import { getPeriodRange, type Period } from '@/lib/periodRange';

type ForecastPayload = {
  status_proyeksi: 'Safe' | 'Warning' | 'Deficit';
  estimasi_pengeluaran_akhir: number;
  pesan_prediksi: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// The LLM sometimes invents a USD conversion (e.g. "($3,810)") — strip it.
// Rupiah-only figures are accurate; the dollar figure is hallucinated.
function sanitizeForecast(text: string): string {
  if (!text) return text;
  return text
    .replace(/\s*\([^)]*\$[^)]*\)/g, '') // "(...$3,810)"
    .replace(/\$\s?[\d.,]+/g, '') // any stray "$3,810"
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as Period) || 'payperiod';
  const now = new Date();
  const { rangeStart, rangeEnd, periodLabel } = getPeriodRange(period, now);
  const range = { gte: rangeStart, lte: rangeEnd };

  const where: any = { occurredAt: range, direction: 'expense' };
  const targetUserId = searchParams.get('userId');
  where.userId = user.role === 'admin' && targetUserId ? targetUserId : user.id;

  const [expense, income, byCategory] = await Promise.all([
    prisma.transaction.aggregate({ where, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...where, direction: 'income' }, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ['category'], where, _sum: { amount: true } }),
  ]);

  const spent = expense._sum.amount ?? 0;
  const incomeTotal = income._sum.amount ?? 0;

  // ---- Math projection: burn rate across the selected period ----
  let mathProjection = spent;
  if (period !== 'all') {
    const totalMs = rangeEnd.getTime() - rangeStart.getTime();
    const elapsedMs = Math.min(Math.max(now.getTime() - rangeStart.getTime(), 0), totalMs);
    const daysTotal = totalMs / 86_400_000;
    const daysElapsed = elapsedMs / 86_400_000;
    const dailyBurn = daysElapsed > 0 ? spent / daysElapsed : 0;
    mathProjection = Math.round(dailyBurn * daysTotal);
  }

  // ---- routine patterns from SQL (top recurring categories) ----
  const patterns = byCategory
    .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
    .slice(0, 4)
    .map((row) => {
      const amount = row._sum.amount ?? 0;
      return `Category ${row.category}: Rp${amount.toLocaleString('id-ID')} this period`;
    });

  // ---- AI forecast (deterministic status; LLM writes only prose) ----
  const body = {
    model: process.env.OPENAI_MODEL || 'qwen2.5:3b',
    messages: [
      {
        role: 'system',
        content: `You are a financial risk analyst. You will receive the user's current spending in the selected period, the mathematical projection until period-end, and their recurring spending patterns (source data is in Bahasa Indonesia).

Tasks:
1. Assess whether the user will go over budget at period-end based on the patterns.
2. Identify which recurring expense weighs most on the remaining budget.
3. Give ONE sentence of warning or tactical advice so the remaining funds last until the next payday.

Write amounts in Rupiah only. Do NOT add any USD / dollar conversion.
You MUST respond with ONLY a valid JSON object matching this exact schema, no other text:
{"status_proyeksi": "Safe" | "Warning" | "Deficit", "estimasi_pengeluaran_akhir": integer, "pesan_prediksi": "One sentence warning/prediction advice in English."}`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          tanggal_analisa: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          periode: periodLabel,
          sisa_hari_periode_ini: Math.max(
            0,
            Math.ceil((rangeEnd.getTime() - now.getTime()) / 86_400_000)
          ),
          budget_periode: incomeTotal,
          pengeluaran_saat_ini: spent,
          proyeksi_matematis_akhir_periode: mathProjection,
          pola_rutin_terdeteksi: patterns,
        }),
      },
    ],
    max_tokens: 256,
  };

  let llm: ForecastPayload | null = null;
  try {
    const rawContent = await callOmniRoute(body);
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      llm = {
        status_proyeksi: ['Safe', 'Warning', 'Deficit'].includes(parsed.status_proyeksi)
          ? parsed.status_proyeksi
          : 'Warning',
        estimasi_pengeluaran_akhir:
          typeof parsed.estimasi_pengeluaran_akhir === 'number'
            ? Math.round(parsed.estimasi_pengeluaran_akhir)
            : mathProjection,
        pesan_prediksi: sanitizeForecast(String(parsed.pesan_prediksi || '')),
      };
    }
  } catch {
    llm = null;
  }

  const aiEstimate = llm
    ? clamp(llm.estimasi_pengeluaran_akhir, spent, Math.max(spent, mathProjection * 1.5))
    : mathProjection;
  const status_proyeksi: ForecastPayload['status_proyeksi'] =
    aiEstimate <= incomeTotal ? 'Safe' : aiEstimate <= incomeTotal * 1.15 ? 'Warning' : 'Deficit';

  return NextResponse.json({
    periodLabel,
    bulan: periodLabel, // legacy fallback for older clients
    budget: incomeTotal, // period income = the 100% reference line
    pengeluaran_saat_ini: spent,
    proyeksi_matematis: mathProjection,
    estimasi_pengeluaran_akhir: aiEstimate,
    status_proyeksi,
    pesan_prediksi:
      llm?.pesan_prediksi ||
      (status_proyeksi === 'Safe'
        ? 'Projected spending stays within budget. Keep the current pace.'
        : status_proyeksi === 'Warning'
          ? 'Projection is approaching the budget limit. Trim non-essential spending.'
          : 'Projection exceeds budget. Cut discretionary spending so funds last until payday.'),
    pola_rutin_terdeteksi: patterns,
  });
}
