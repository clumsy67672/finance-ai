import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { callOmniRoute } from '@/lib/openai';
import { TRANSACTION_CATEGORIES } from '@/lib/constants';
import { getPeriodRange, type Period } from '@/lib/periodRange';

type InsightPayload = {
  status_kesehatan: 'Healthy' | 'Warning' | 'Critical';
  analisa_utama: string;
  rekomendasi_aksi: string[];
};

// Cache key per (user, period) so insights match the dashboard toggle.
function periodKey(period: Period): string {
  const { rangeStart } = getPeriodRange(period, new Date());
  return `${period}:${rangeStart.toISOString().slice(0, 10)}`;
}

async function generateInsight(userId: string, period: Period): Promise<InsightPayload | null> {
  const { rangeStart, rangeEnd, periodLabel } = getPeriodRange(period, new Date());
  const range = { gte: rangeStart, lte: rangeEnd };

  const [income, expense, byCategory] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId, direction: 'income', occurredAt: range },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { userId, direction: 'expense', occurredAt: range },
      _sum: { amount: true }
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { userId, direction: 'expense', occurredAt: range },
      _sum: { amount: true }
    })
  ]);

  const totalIncome = income._sum.amount ?? 0;
  const totalExpense = expense._sum.amount ?? 0;
  const categoryBreakdown = byCategory
    .map((c) => `${c.category}: Rp${(c._sum.amount ?? 0).toLocaleString('id-ID')}`)
    .join(', ');

  const body = {
    model: process.env.OPENAI_MODEL || 'qwen2.5:3b',
    messages: [
      {
        role: 'system',
        content: `You are a family finance coach analyzing Indonesian household spending (input data is in Bahasa Indonesia).
Return ONLY valid JSON, no markdown, no code fences:
{"analisa_utama": "string (1-2 sentences, in English)", "rekomendasi_aksi": ["string", "..." ]}

Rules:
- All prose MUST be in English.
- analisa_utama: mention the biggest category and the saving rate
- rekomendasi_aksi: exactly 3 actionable, specific tips in English
- Categories (EXACT strings): ${TRANSACTION_CATEGORIES.join(', ')}`
      },
      {
        role: 'user',
        content: `Period: ${periodLabel}\nIncome: Rp${totalIncome}\nExpense: Rp${totalExpense}\nNet: Rp${totalIncome - totalExpense}\nBy category: ${categoryBreakdown || 'none'}`
      }
    ],
    max_tokens: 512
  };

  const rawContent = await callOmniRoute(body);
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed.analisa_utama) return null;
  // status_kesehatan computed deterministically from the numbers — the 3B
  // model is unreliable for labels, so never trust its status output.
  const spendRatio = totalIncome > 0 ? totalExpense / totalIncome : 1;
  const status_kesehatan: InsightPayload['status_kesehatan'] =
    spendRatio <= 0.5 ? 'Healthy' : spendRatio <= 0.8 ? 'Warning' : 'Critical';
  return {
    status_kesehatan,
    analisa_utama: String(parsed.analisa_utama),
    rekomendasi_aksi: Array.isArray(parsed.rekomendasi_aksi)
      ? parsed.rekomendasi_aksi.slice(0, 5).map(String)
      : []
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const period = (new URL(request.url).searchParams.get('period') as Period) || 'payperiod';
  const key = periodKey(period);
  const cached = await prisma.insightCache.findUnique({
    where: { userId_month: { userId: user.id, month: key } }
  });
  if (cached) {
    return NextResponse.json({ cached: true, ...(cached.payload as object) });
  }
  return NextResponse.json({ cached: false });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const period = (new URL(request.url).searchParams.get('period') as Period) || 'payperiod';
  const key = periodKey(period);

  const insight = await generateInsight(user.id, period);
  if (!insight) {
    return NextResponse.json({ error: 'Insight generation failed' }, { status: 502 });
  }

  await prisma.insightCache.upsert({
    where: { userId_month: { userId: user.id, month: key } },
    update: { payload: insight as unknown as object },
    create: { userId: user.id, month: key, payload: insight as unknown as object }
  });

  return NextResponse.json({ cached: false, ...insight });
}
