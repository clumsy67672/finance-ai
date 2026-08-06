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
  const { rangeStart, rangeEnd } = getPeriodRange(period, new Date());
  const targetUserId = searchParams.get('userId');

  const where: any = {
    occurredAt: { gte: rangeStart, lte: rangeEnd },
    direction: 'expense'
  };

  if (user.role === 'admin' && targetUserId) {
    where.userId = targetUserId;
  } else {
    where.userId = user.id;
  }

  const data = await prisma.transaction.groupBy({
    by: ['category'],
    where,
    _sum: { amount: true }
  });

  return NextResponse.json({
    categories: data
      .map((item) => ({ category: item.category, total: item._sum.amount ?? 0 }))
      .sort((a, b) => b.total - a.total)
  });
}
