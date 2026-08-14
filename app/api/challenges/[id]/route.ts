import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const challenge = await prisma.challenge.findFirst({
    where: { id: params.id, userId: user.id }
  });
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const data: any = {};

  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.amount !== undefined) data.amount = Math.round(Number(body.amount));
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;

  const updated = await prisma.challenge.update({
    where: { id: challenge.id },
    data
  });
  return NextResponse.json({ challenge: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const challenge = await prisma.challenge.findFirst({
    where: { id: params.id, userId: user.id }
  });
  if (!challenge) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.challenge.delete({ where: { id: challenge.id } });
  return NextResponse.json({ ok: true });
}
