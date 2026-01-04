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
  const now = new Date();
  let monthDate = !monthParam ? now : new Date(Number(yearStr), Number(monthStr) - 1, 1);
  if (Number.isNaN(monthDate.getTime())) {
    monthDate = now;
  }
  const range = {
    gte: startOfMonth(monthDate),
    lte: endOfMonth(monthDate)
  };

  const whereBase = {
    occurredAt: range,
    userId: user.role === 'admin' ? undefined : user.id
  };

  const targetUserId = searchParams.get('userId');
  if (user.role === 'admin' && targetUserId) {
    whereBase.userId = targetUserId;
  }

  const [income, expense, count] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...whereBase, direction: 'income' },
      _sum: { amount: true }
    }),
    prisma.transaction.aggregate({
      where: { ...whereBase, direction: 'expense' },
      _sum: { amount: true }
    }),
    prisma.transaction.count({ where: whereBase })
  ]);

  const totalIncome = income._sum.amount ?? 0;
  const totalExpense = expense._sum.amount ?? 0;

  return NextResponse.json({
    month: range.gte.toISOString(),
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    count
  });
}
