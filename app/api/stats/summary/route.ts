import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfDay, format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

type Period = 'payperiod' | 'month' | 'year' | 'all';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as Period) || 'payperiod';

  const now = new Date();
  let rangeStart: Date;
  let rangeEnd: Date;
  let periodLabel: string;

  if (period === 'payperiod') {
    // Paycheck-anchored period: 25th (prev month) -> 24th (this month).
    if (now.getDate() >= 25) {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 25);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 24, 23, 59, 59);
    } else {
      rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 25);
      rangeEnd = new Date(now.getFullYear(), now.getMonth(), 24, 23, 59, 59);
    }
    periodLabel = `${format(rangeStart, 'MMM d')} – ${format(rangeEnd, 'MMM d, yyyy')}`;
  } else if (period === 'month') {
    const monthParam = searchParams.get('month');
    const [yearStr, monthStr] = monthParam ? monthParam.split('-') : [];
    const monthDate = !monthParam ? now : new Date(Number(yearStr), Number(monthStr) - 1, 1);
    rangeStart = startOfMonth(monthDate);
    rangeEnd = endOfMonth(monthDate);
    periodLabel = format(rangeStart, 'MMMM yyyy');
  } else if (period === 'year') {
    rangeStart = startOfYear(now);
    rangeEnd = endOfYear(now);
    periodLabel = `Year ${now.getFullYear()}`;
  } else {
    // all time
    rangeStart = new Date(2000, 0, 1);
    rangeEnd = now;
    periodLabel = 'All time';
  }

  const range = { gte: rangeStart, lte: rangeEnd };

  const targetUserId = searchParams.get('userId');
  const whereBase: any = { occurredAt: range };
  if (user.role === 'admin' && targetUserId) {
    whereBase.userId = targetUserId;
  } else {
    whereBase.userId = user.id;
  }

  const [income, expense, count, todayIncome, todayExpense, todayCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...whereBase, direction: 'income' },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...whereBase, direction: 'expense' },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: whereBase }),
    prisma.transaction.aggregate({
      where: { ...whereBase, direction: 'income', occurredAt: { gte: startOfDay(now) } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...whereBase, direction: 'expense', occurredAt: { gte: startOfDay(now) } },
      _sum: { amount: true },
    }),
    prisma.transaction.count({ where: { ...whereBase, occurredAt: { gte: startOfDay(now) } } }),
  ]);

  const totalIncome = income._sum.amount ?? 0;
  const totalExpense = expense._sum.amount ?? 0;

  const today = {
    income: todayIncome._sum.amount ?? 0,
    spent: todayExpense._sum.amount ?? 0,
    net: (todayIncome._sum.amount ?? 0) - (todayExpense._sum.amount ?? 0),
    count: todayCount,
  };

  // Generic pacing: elapsed fraction of the selected period.
  let pacing: any = null;
  if (period !== 'all') {
    const totalMs = rangeEnd.getTime() - rangeStart.getTime();
    const elapsedMs = Math.min(Math.max(now.getTime() - rangeStart.getTime(), 0), totalMs);
    const dayFraction = totalMs > 0 ? elapsedMs / totalMs : 0;
    const expectedByToday = Math.round(totalIncome * dayFraction);
    const pacingPercent =
      expectedByToday > 0 ? Math.round((totalExpense / expectedByToday) * 100) : 0;
    pacing = {
      spent: totalExpense,
      income: totalIncome,
      expectedByToday,
      pacingPercent,
      overPace: pacingPercent > 115,
    };
  }

  return NextResponse.json({
    month: rangeStart.toISOString(),
    period,
    periodLabel,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    count,
    pacing,
    today,
  });
}
