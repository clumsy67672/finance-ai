import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { deadline: 'asc' }
  });
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const title = String(body.title ?? '').trim();
  const note = body.note ? String(body.note).trim() : null;
  const amount = Number(body.amount);
  const deadline = body.deadline ? new Date(body.deadline) : null;

  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'positive amount required' }, { status: 400 });
  }

  const goal = await prisma.goal.create({
    data: {
      userId: user.id,
      title,
      note,
      amount: Math.round(amount),
      deadline,
      saved: 0,
      achieved: false
    }
  });
  return NextResponse.json({ goal });
}
