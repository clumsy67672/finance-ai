import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const batchUpdateSchema = z.object({
  ids: z.array(z.string()),
  status: z.enum(['PROCESSING', 'PROCESSED', 'ERROR']),
  error: z.string().optional(),
});

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const data = batchUpdateSchema.parse(payload);

    const result = await prisma.rawQueue.updateMany({
      where: { id: { in: data.ids } },
      data: {
        status: data.status,
        ...(data.error !== undefined ? { error: data.error } : {}),
      },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error('queue_batch_update_error', error);
    const message = error instanceof Error ? error.message : 'Unable to update queue entries';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
