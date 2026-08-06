import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getPeriodRange, type Period } from '@/lib/periodRange';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as Period) || 'payperiod';
  const { rangeStart, rangeEnd } = getPeriodRange(period, new Date());
  const targetUserId = searchParams.get('userId');

  const where: any = { occurredAt: { gte: rangeStart, lte: rangeEnd }, direction: 'expense' };
  if (user.role === 'admin' && targetUserId) where.userId = targetUserId;
  else where.userId = user.id;

  const [budgets, spentByCategory] = await Promise.all([
    prisma.budget.findMany({ where: { userId: user.id } }),
    prisma.transaction.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true }
    })
  ]);

  const spentMap = new Map(spentByCategory.map((c) => [c.category, c._sum.amount ?? 0]));
  const progress = budgets
    .map((b) => {
      const spent = spentMap.get(b.category) ?? 0;
      return {
        category: b.category,
        target: b.amount,
        spent,
        remaining: Math.max(b.amount - spent, 0),
        ratio: b.amount > 0 ? Math.min(spent / b.amount, 1) : 0,
        over: spent > b.amount
      };
    })
    .sort((a, b) => b.ratio - a.ratio);

  return NextResponse.json({ progress });
}
