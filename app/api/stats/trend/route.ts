import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getPeriodRange, type Period } from '@/lib/periodRange';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as Period) || 'payperiod';
  const now = new Date();
  const { rangeStart, rangeEnd } = getPeriodRange(period, now);
  const range = { gte: rangeStart, lte: rangeEnd };

  const targetUserId = searchParams.get('userId');
  const where: any = { occurredAt: range };
  where.userId = user.role === 'admin' && targetUserId ? targetUserId : user.id;

  // One grouped query: sum income/expense per calendar day across the window.
  const grouped = await prisma.transaction.groupBy({
    by: ['occurredAt', 'direction'],
    where,
    _sum: { amount: true },
  });

  const buckets: Record<string, { income: number; expense: number }> = {};
  for (const row of grouped) {
    const dayKey = row.occurredAt.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!buckets[dayKey]) buckets[dayKey] = { income: 0, expense: 0 };
    const amt = row._sum.amount ?? 0;
    if (row.direction === 'income') buckets[dayKey].income += amt;
    else if (row.direction === 'expense') buckets[dayKey].expense += amt;
  }

  const trend = Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, income: v.income, expense: v.expense }));

  return NextResponse.json({ resolution: 'daily', period, trend });
}
