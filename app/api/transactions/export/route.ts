import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'csv';
  const month = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const rangeParam = searchParams.get('range');
  const category = searchParams.get('category') || undefined;
  const direction = searchParams.get('direction') || undefined;
  const targetUser = searchParams.get('userId') || undefined;

  const range = rangeParam === 'year' || rangeParam === 'lifetime' ? rangeParam : 'month';
  const where: any = {};

  if (category) where.category = category;
  if (direction) where.direction = direction;

  if (range === 'lifetime') {
    // no date filter
  } else if (range === 'year' && yearParam) {
    const year = Number(yearParam);
    if (!Number.isNaN(year)) {
      const start = startOfYear(new Date(year, 0, 1));
      const end = endOfYear(start);
      where.occurredAt = { gte: start, lte: end };
    }
  } else if (month) {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    if (!Number.isNaN(year) && !Number.isNaN(monthIndex)) {
      const start = startOfMonth(new Date(year, monthIndex, 1));
      const end = endOfMonth(start);
      where.occurredAt = { gte: start, lte: end };
    }
  }

  if (user.role === 'admin' && targetUser) {
    where.userId = targetUser;
  } else {
    where.userId = user.id;
  }

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { occurredAt: 'asc' },
  });

  const filename = `finance-export-${new Date().toISOString().split('T')[0]}`;

  if (format === 'jsonl') {
    const lines = transactions.map((t) =>
      JSON.stringify({
        date: t.occurredAt.toISOString().split('T')[0],
        amount: t.amount,
        direction: t.direction,
        category: t.category,
        description: t.cleanNote,
        merchant: t.merchant,
        source: t.source,
        tags: t.tags,
      })
    );
    return new NextResponse(lines.join('\n') + '\n', {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Content-Disposition': `attachment; filename="${filename}.jsonl"`,
      },
    });
  }

  // Default: CSV
  const header = 'date,amount,direction,category,description,merchant,source\n';
  const rows = transactions
    .map((t) => {
      const date = t.occurredAt.toISOString().split('T')[0];
      const desc = t.cleanNote.replace(/"/g, '""');
      const merch = (t.merchant || '').replace(/"/g, '""');
      return `${date},${t.amount},${t.direction},"${desc}","${merch}",${t.source}`;
    })
    .join('\n');

  return new NextResponse(header + rows + '\n', {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}.csv"`,
    },
  });
}
