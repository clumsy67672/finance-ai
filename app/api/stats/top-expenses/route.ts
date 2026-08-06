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
    direction: 'expense',
    occurredAt: { gte: rangeStart, lte: rangeEnd }
  };

  if (user.role === 'admin' && targetUserId) {
    where.userId = targetUserId;
  } else {
    where.userId = user.id;
  }

  const expenses = await prisma.transaction.findMany({
    where,
    orderBy: { amount: 'desc' },
    take: 10,
    select: {
      id: true,
      cleanNote: true,
      amount: true,
      occurredAt: true,
      category: true
    }
  });

  return NextResponse.json({ expenses });
}
