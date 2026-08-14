import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const challenges = await prisma.challenge.findMany({
    where: { userId: user.id },
    orderBy: { startDate: 'asc' }
  });
  return NextResponse.json({ challenges });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const title = String(body.title ?? '').trim();
  const note = body.note ? String(body.note).trim() : null;
  const amount = Number(body.amount);
  const startDate = body.startDate ? new Date(body.startDate) : new Date();
  const endDate = body.endDate ? new Date(body.endDate) : null;
  const severity = ['low', 'medium', 'high', 'critical'].includes(body.severity)
    ? body.severity
    : 'high';

  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'positive amount required' }, { status: 400 });
  }

  const challenge = await prisma.challenge.create({
    data: {
      userId: user.id,
      title,
      note,
      amount: Math.round(amount),
      startDate,
      endDate,
      severity,
      active: true
    }
  });
  return NextResponse.json({ challenge });
}
