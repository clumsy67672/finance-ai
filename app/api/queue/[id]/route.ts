import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const statusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'PROCESSING', 'PROCESSED', 'ERROR']),
  error: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;
    const payload = await request.json();
    const data = statusUpdateSchema.parse(payload);

    const existing = await prisma.rawQueue.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 });
    }

    // Non-admin users can only update their own entries
    if (user.role !== 'admin' && existing.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.rawQueue.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.error !== undefined ? { error: data.error } : {}),
      },
    });

    return NextResponse.json({ entry: updated });
  } catch (error) {
    console.error('queue_update_error', error);
    const message = error instanceof Error ? error.message : 'Unable to update queue entry';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
