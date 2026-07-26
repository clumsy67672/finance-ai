import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { transactionMessageSchema } from '@/lib/validators';
import { parseChatMessage } from '@/lib/parsing';
import { classifyTransaction, parseTransactions } from '@/lib/openai';
import { AI_VERSION } from '@/lib/constants';
import { assertRateLimit } from '@/lib/rate-limit';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitParam) ? limitParam : 50;
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
    // no date filter, fetch full history
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
    include: {
      user: { select: { id: true, username: true } }
    },
    orderBy: { occurredAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200)
  });

  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    assertRateLimit(`${user.id}:input`, 5, 15000);
    const payload = await request.json();
    const data = transactionMessageSchema.parse(payload);

    // Step 1: Try AI parsing — extracts all transactions from raw text
    const aiParsed = await parseTransactions(data.message);

    const createdTransactions = [];

    if (aiParsed && aiParsed.length > 0) {
      // AI successfully parsed — save each transaction directly
      for (const tx of aiParsed) {
        const transaction = await prisma.transaction.create({
          data: {
            userId: user.id,
            amount: tx.amount,
            direction: tx.direction as any,
            rawMessage: data.message,
            cleanNote: tx.cleanNote,
            category: tx.category,
            occurredAt: new Date(),
            merchant: tx.merchant,
            source: tx.source as any,
            tags: tx.tags,
            aiConfidence: tx.confidence,
            aiModel: process.env.OPENAI_MODEL || 'qwen-web/qwen3.6-plus',
            aiVersion: AI_VERSION
          },
          include: {
            user: { select: { id: true, username: true } }
          }
        });
        createdTransactions.push(transaction);
      }
    } else {
      // Fallback: local parsing
      const entries = data.message
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (entries.length === 0) {
        throw new Error('Message is empty');
      }

      for (const entry of entries) {
        const { amount, cleanNote, direction } = parseChatMessage(entry);
        const classification = await classifyTransaction({ amount, cleanNote, direction });

        const transaction = await prisma.transaction.create({
          data: {
            userId: user.id,
            amount,
            direction,
            rawMessage: entry,
            cleanNote,
            category: classification.category,
            occurredAt: new Date(),
            merchant: classification.merchant,
            source: classification.source,
            tags: classification.tags,
            aiConfidence: classification.confidence,
            aiModel: classification.model,
            aiVersion: classification.version
          },
          include: {
            user: { select: { id: true, username: true } }
          }
        });

        createdTransactions.push(transaction);
      }
    }

    if (createdTransactions.length === 1) {
      return NextResponse.json({ transaction: createdTransactions[0] });
    }

    return NextResponse.json({ transactions: createdTransactions });
  } catch (error) {
    console.error('transaction_create_error', error);
    const message = error instanceof Error ? error.message : 'Unable to save transaction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
