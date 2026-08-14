import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goal = await prisma.goal.findFirst({
    where: { id: params.id, userId: user.id }
  });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json();
  const data: any = {};

  if (body.saved !== undefined) data.saved = Math.round(Number(body.saved));
  if (body.achieved !== undefined) data.achieved = Boolean(body.achieved);

  const updated = await prisma.goal.update({
    where: { id: goal.id },
    data
  });
  return NextResponse.json({ goal: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const goal = await prisma.goal.findFirst({
    where: { id: params.id, userId: user.id }
  });
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.goal.delete({ where: { id: goal.id } });
  return NextResponse.json({ ok: true });
}
