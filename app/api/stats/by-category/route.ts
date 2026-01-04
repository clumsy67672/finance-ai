import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const [yearStr, monthStr] = monthParam ? monthParam.split('-') : [];
  const targetUserId = searchParams.get('userId');

  let baseDate = monthParam ? new Date(Number(yearStr), Number(monthStr) - 1, 1) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const where: any = {
    occurredAt: {
      gte: startOfMonth(baseDate),
      lte: endOfMonth(baseDate)
    },
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
