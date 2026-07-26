import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const queueSubmitSchema = z.object({
  message: z.string().min(1).max(1000),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || undefined;
  const limitParam = Number(searchParams.get('limit') ?? '50');
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 50;

  const where: any = {};
  if (status) {
    where.status = status;
  }
  // Admin can see all; members see only their own
  if (user.role !== 'admin') {
    where.userId = user.id;
  }

  const entries = await prisma.rawQueue.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const data = queueSubmitSchema.parse(payload);

    const lines = data.message
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return NextResponse.json({ error: 'Message is empty after splitting' }, { status: 400 });
    }

    const createdEntries = await prisma.$transaction(
      lines.map((line) =>
        prisma.rawQueue.create({
          data: {
            rawText: line,
            userId: user.id,
            status: 'PENDING',
          },
        })
      )
    );

    return NextResponse.json({ entries: createdEntries }, { status: 201 });
  } catch (error) {
    console.error('queue_create_error', error);
    const message = error instanceof Error ? error.message : 'Unable to queue message';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
