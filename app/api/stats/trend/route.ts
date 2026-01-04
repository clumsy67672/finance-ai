import { NextResponse } from 'next/server';
import { subDays, formatISO, startOfWeek } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const resolution = searchParams.get('resolution') === 'weekly' ? 'weekly' : 'daily';
  const targetUserId = searchParams.get('userId');
  const lookbackDays = resolution === 'weekly' ? 84 : 30;
  const startDate = subDays(new Date(), lookbackDays);

  const where: any = {
    occurredAt: { gte: startDate }
  };

  if (user.role === 'admin' && targetUserId) {
    where.userId = targetUserId;
  } else {
    where.userId = user.id;
  }

  const entries = await prisma.transaction.findMany({
    where,
    select: { amount: true, occurredAt: true, direction: true },
    orderBy: { occurredAt: 'asc' }
  });

  const buckets: Record<string, { income: number; expense: number }> = {};

  for (const entry of entries) {
    const key =
      resolution === 'weekly'
        ? formatISO(startOfWeek(entry.occurredAt, { weekStartsOn: 1 }), { representation: 'date' })
        : formatISO(entry.occurredAt, { representation: 'date' });
    if (!buckets[key]) {
      buckets[key] = { income: 0, expense: 0 };
    }
    if (entry.direction === 'income') {
      buckets[key].income += entry.amount;
    } else if (entry.direction === 'expense') {
      buckets[key].expense += entry.amount;
    }
  }

  const trend = Object.entries(buckets)
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));

  return NextResponse.json({ resolution, trend });
}
