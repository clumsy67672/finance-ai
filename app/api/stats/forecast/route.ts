import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { callOmniRoute } from '@/lib/openai';

type ForecastPayload = {
  status_proyeksi: 'Aman' | 'Waspada' | 'Defisit';
  estimasi_pengeluaran_akhir: number;
  pesan_prediksi: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const monthParam = new URL(request.url).searchParams.get('month');
  const now = new Date();
  let monthDate = now;
  if (monthParam) {
    const [yearStr, monthStr] = monthParam.split('-');
    monthDate = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  }
  if (Number.isNaN(monthDate.getTime())) {
    monthDate = now;
  }
  const range = {
    gte: startOfMonth(monthDate),
    lte: endOfMonth(monthDate)
  };

  const where: any = {
    occurredAt: range,
    direction: 'expense'
  };
  const targetUserId = new URL(request.url).searchParams.get('userId');
  where.userId = user.role === 'admin' && targetUserId ? targetUserId : user.id;

  const [expense, income, byCategory] = await Promise.all([
    prisma.transaction.aggregate({ where, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...where, direction: 'income' }, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ['category'], where, _sum: { amount: true } })
  ]);

  const spent = expense._sum.amount ?? 0;
  const incomeTotal = income._sum.amount ?? 0;

  // ---- 5.1 Math: daily burn rate projection ----
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const dailyBurn = dayOfMonth > 0 ? spent / dayOfMonth : 0;
  const mathProjection = Math.round(dailyBurn * daysInMonth);

  // ---- routine patterns from SQL (top recurring categories) ----
  const patterns = byCategory
    .sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0))
    .slice(0, 4)
    .map((row) => {
      const amount = row._sum.amount ?? 0;
      return `Kategori ${row.category}: total Rp${amount.toLocaleString('id-ID')} bulan ini`;
    });

  const bulanLabel = monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  // ---- 5.2 AI forecast ----
  const body = {
    model: process.env.OPENAI_MODEL || 'qwen2.5:3b',
    messages: [
      {
        role: 'system',
        content: `Anda adalah analis risiko keuangan. Anda akan menerima data pengeluaran saat ini, proyeksi matematis hingga akhir bulan, dan pola pengeluaran rutin pengguna.

Tugas Anda:
1. Analisa apakah pengguna akan overbudget di akhir bulan berdasarkan pola yang ada.
2. Identifikasi pengeluaran rutin mana yang paling membebani sisa budget.
3. Berikan 1 kalimat peringatan atau saran taktis agar sisa dana cukup hingga gajian berikutnya.

Anda WAJIB merespons HANYA dengan objek JSON yang valid menggunakan skema berikut, tanpa teks lain:
{"status_proyeksi": "Aman" | "Waspada" | "Defisit", "estimasi_pengeluaran_akhir": angka (integer), "pesan_prediksi": "Satu kalimat peringatan/saran prediksi dalam Bahasa Indonesia."}`
      },
      {
        role: 'user',
        content: JSON.stringify({
          tanggal_analisa: now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
          sisa_hari_bulan_ini: daysInMonth - dayOfMonth,
          budget_bulanan: incomeTotal,
          pengeluaran_saat_ini: spent,
          proyeksi_matematis_akhir_bulan: mathProjection,
          pola_rutin_terdeteksi: patterns
        })
      }
    ],
    max_tokens: 256
  };

  let llm: ForecastPayload | null = null;
  try {
    const rawContent = await callOmniRoute(body);
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      llm = {
        status_proyeksi: ['Aman', 'Waspada', 'Defisit'].includes(parsed.status_proyeksi)
          ? parsed.status_proyeksi
          : 'Waspada',
        estimasi_pengeluaran_akhir:
          typeof parsed.estimasi_pengeluaran_akhir === 'number'
            ? Math.round(parsed.estimasi_pengeluaran_akhir)
            : mathProjection,
        pesan_prediksi: String(parsed.pesan_prediksi || '')
      };
    }
  } catch {
    llm = null;
  }

  // ---- deterministic status from the math, LLM only refines the estimate ----
  const aiEstimate = llm ? clamp(llm.estimasi_pengeluaran_akhir, spent, Math.max(spent, mathProjection * 1.5)) : mathProjection;
  const status_proyeksi: ForecastPayload['status_proyeksi'] =
    aiEstimate <= incomeTotal ? 'Aman' : aiEstimate <= incomeTotal * 1.15 ? 'Waspada' : 'Defisit';

  return NextResponse.json({
    bulan: bulanLabel,
    pengeluaran_saat_ini: spent,
    proyeksi_matematis: mathProjection,
    estimasi_pengeluaran_akhir: aiEstimate,
    status_proyeksi,
    pesan_prediksi:
      llm?.pesan_prediksi ||
      (status_proyeksi === 'Aman'
        ? 'Proyeksi pengeluaran masih di dalam budget. Lanjutkan pola saat ini.'
        : status_proyeksi === 'Waspada'
          ? 'Proyeksi mendekati batas budget. Kurangi pengeluaran tidak rutin.'
          : 'Proyeksi melebihi budget. Kurangi pengeluaran diskresioner agar dana cukup sampai gajian.'),
    pola_rutin_terdeteksi: patterns
  });
}
