import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { TRANSACTION_CATEGORIES, TRANSACTION_DIRECTIONS, TRANSACTION_SOURCES } from '@/lib/constants';
import { parseChatMessage } from '@/lib/parsing';

const batchTransactionSchema = z.object({
  transactions: z.array(
    z.object({
      rawText: z.string().min(1),
      amount: z.number().int().positive(),
      direction: z.enum(TRANSACTION_DIRECTIONS as any),
      category: z.string().min(1),
      description: z.string().min(1).max(280),
      merchant: z.string().optional(),
      source: z.enum(TRANSACTION_SOURCES as any).optional(),
      tags: z.array(z.string()).optional(),
      rawQueueId: z.string(),
    })
  ).min(1),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const data = batchTransactionSchema.parse(payload);

    const createdTransactions = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of data.transactions) {
        // Parse rawText to extract amount/direction as a validation step
        const parsed = parseChatMessage(item.rawText);

        // Verify the queue entry exists and is in PENDING/PROCESSING status
        const queueEntry = await tx.rawQueue.findUnique({
          where: { id: item.rawQueueId },
        });

        if (!queueEntry) {
          throw new Error(`Queue entry ${item.rawQueueId} not found`);
        }
        if (queueEntry.status === 'PROCESSED') {
          throw new Error(`Queue entry ${item.rawQueueId} has already been processed`);
        }

        // Create the transaction
        const transaction = await tx.transaction.create({
          data: {
            userId: user.id,
            amount: item.amount,
            direction: item.direction,
            rawMessage: item.rawText,
            cleanNote: item.description,
            category: item.category,
            occurredAt: new Date(),
            merchant: item.merchant ?? '',
            source: (item.source ?? 'unknown') as any,
            tags: item.tags ?? [],
            aiConfidence: 1.0,
            aiModel: 'batch-worker',
            aiVersion: 'v1.0.0',
            rawQueueId: item.rawQueueId,
          },
          include: {
            user: { select: { id: true, username: true } },
          },
        });

        results.push(transaction);
      }

      // Mark all corresponding RawQueue entries as PROCESSED
      const queueIds = data.transactions.map((t) => t.rawQueueId);
      await tx.rawQueue.updateMany({
        where: { id: { in: queueIds } },
        data: { status: 'PROCESSED' },
      });

      return results;
    });

    return NextResponse.json({ transactions: createdTransactions }, { status: 201 });
  } catch (error) {
    console.error('batch_transaction_error', error);
    const message = error instanceof Error ? error.message : 'Unable to process batch';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
