import { NextResponse } from 'next/server';
import { startOfMonth, endOfMonth } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const NEEDS_CATEGORIES = new Set([
  'Groceries',
  'Fuel / Gas',
  'Loan / Debt',
  'Transport',
  'Utilities',
  'Internet & Mobile',
  'Household Needs',
  'Health',
  'Insurance',
  'Education',
  'Taxes / Fees',
  'Vehicle Maintenance'
]);

const WANTS_CATEGORIES = new Set([
  'Food & Drink',
  'Entertainment',
  'Sports / Outdoor',
  'Online Shopping',
  'Subscriptions',
  'Clothing',
  'Self Care',
  'Family / Gifts',
  'Pets',
  'Donations / Charity'
]);

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
  if (user.role === 'admin' && targetUserId) {
    where.userId = targetUserId;
  } else {
    where.userId = user.id;
  }

  const byCategory = await prisma.transaction.groupBy({
    by: ['category'],
    where,
    _sum: { amount: true }
  });

  let needs = 0;
  let wants = 0;
  let other = 0;
  for (const row of byCategory) {
    const amount = row._sum.amount ?? 0;
    if (NEEDS_CATEGORIES.has(row.category)) needs += amount;
    else if (WANTS_CATEGORIES.has(row.category)) wants += amount;
    else other += amount;
  }

  return NextResponse.json({
    month: range.gte.toISOString(),
    needs,
    wants,
    other,
    total: needs + wants + other
  });
}
