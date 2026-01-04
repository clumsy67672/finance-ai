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
  const targetUserId = searchParams.get('userId');
  const [yearStr, monthStr] = monthParam ? monthParam.split('-') : [];
  let baseDate = monthParam ? new Date(Number(yearStr), Number(monthStr) - 1, 1) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const where: any = {
    direction: 'expense'
  };

  if (monthParam && !Number.isNaN(baseDate.getTime())) {
    where.occurredAt = {
      gte: startOfMonth(baseDate),
      lte: endOfMonth(baseDate)
    };
  }

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
