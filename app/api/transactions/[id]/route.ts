import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { transactionUpdateSchema } from '@/lib/validators';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || (user.role !== 'admin' && existing.userId !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const data = transactionUpdateSchema.parse(payload);
    const updateData: any = {};
    if (typeof data.amount === 'number') updateData.amount = data.amount;
    if (data.category) updateData.category = data.category;
    if (data.cleanNote) updateData.cleanNote = data.cleanNote.trim();
    if (data.occurredAt) updateData.occurredAt = new Date(data.occurredAt);

    const transaction = await prisma.transaction.update({
      where: { id: params.id },
      data: updateData,
      include: { user: { select: { id: true, username: true } } }
    });

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('transaction_update_error', error);
    const message = error instanceof Error ? error.message : 'Unable to update transaction';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const existing = await prisma.transaction.findUnique({ where: { id: params.id } });
  if (!existing || (user.role !== 'admin' && existing.userId !== user.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
