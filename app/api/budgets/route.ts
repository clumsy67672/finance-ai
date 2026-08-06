import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const budgets = await prisma.budget.findMany({ where: { userId: user.id } });
  return NextResponse.json({ budgets });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const category = String(body.category ?? '').trim();
  const amount = Number(body.amount);
  if (!category || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'category and positive amount required' }, { status: 400 });
  }
  const budget = await prisma.budget.upsert({
    where: { userId_category: { userId: user.id, category } },
    update: { amount: Math.round(amount) },
    create: { userId: user.id, category, amount: Math.round(amount) }
  });
  return NextResponse.json({ budget });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const category = new URL(request.url).searchParams.get('category') ?? '';
  const existing = await prisma.budget.findUnique({
    where: { userId_category: { userId: user.id, category } }
  });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.budget.delete({ where: { userId_category: { userId: user.id, category } } });
  return NextResponse.json({ ok: true });
}
