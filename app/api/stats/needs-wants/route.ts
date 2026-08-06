import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getPeriodRange, type Period } from '@/lib/periodRange';

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
    needs,
    wants,
    other,
    total: needs + wants + other
  });
}
