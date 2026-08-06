import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { AI_VERSION } from '@/lib/constants';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await prisma.recurringTx.findMany({
    where: { userId: user.id },
    orderBy: { dayOfMonth: 'asc' }
  });
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const label = String(body.label ?? '').trim();
  const amount = Number(body.amount);
  if (!label || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'label and positive amount required' }, { status: 400 });
  }
  const item = await prisma.recurringTx.create({
    data: {
      userId: user.id,
      label,
      amount: Math.round(amount),
      direction: (body.direction as any) || 'expense',
      category: String(body.category ?? 'Other'),
      source: (body.source as any) || 'unknown',
      note: body.note ? String(body.note) : null,
      dayOfMonth: Number.isFinite(Number(body.dayOfMonth)) ? Math.min(Math.max(Number(body.dayOfMonth), 1), 28) : 25,
      active: body.active !== false
    }
  });
  return NextResponse.json({ item });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const id = String(body.id ?? '');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const existing = await prisma.recurringTx.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const item = await prisma.recurringTx.update({
    where: { id },
    data: {
      label: body.label !== undefined ? String(body.label) : undefined,
      amount: body.amount !== undefined ? Math.round(Number(body.amount)) : undefined,
      direction: body.direction !== undefined ? (body.direction as any) : undefined,
      category: body.category !== undefined ? String(body.category) : undefined,
      source: body.source !== undefined ? (body.source as any) : undefined,
      note: body.note !== undefined ? (body.note ? String(body.note) : null) : undefined,
      dayOfMonth:
        body.dayOfMonth !== undefined ? Math.min(Math.max(Number(body.dayOfMonth), 1), 28) : undefined,
      active: body.active !== undefined ? Boolean(body.active) : undefined
    }
  });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('id') ?? '';
  const existing = await prisma.recurringTx.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.recurringTx.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
