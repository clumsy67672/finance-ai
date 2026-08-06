import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { AI_VERSION } from '@/lib/constants';

/**
 * Auto-post due recurring transactions for the current user (or all users, if admin).
 * A recurring item is "due" if its dayOfMonth has passed this month and lastPosted
 * is before the start of the current month. Called from a cron / on dashboard load.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const targetUserId =
    user.role === 'admin' ? new URL(request.url).searchParams.get('userId') : user.id;
  const userId = targetUserId ?? user.id;

  const due = await prisma.recurringTx.findMany({
    where: {
      userId,
      active: true,
      OR: [{ lastPosted: null }, { lastPosted: { lt: monthStart } }]
    }
  });

  const posted = [];
  for (const r of due) {
    // Only auto-post if today is on/after the configured day of month
    if (now.getDate() < r.dayOfMonth) continue;
    const occurredAt = new Date(now.getFullYear(), now.getMonth(), r.dayOfMonth);
    const tx = await prisma.transaction.create({
      data: {
        userId,
        amount: r.amount,
        direction: r.direction,
        rawMessage: `[recurring] ${r.label}`,
        cleanNote: r.note || r.label,
        category: r.category,
        source: r.source,
        tags: ['recurring'],
        aiConfidence: 1,
        aiModel: 'system',
        aiVersion: AI_VERSION
      }
    });
    await prisma.recurringTx.update({ where: { id: r.id }, data: { lastPosted: now } });
    posted.push(tx.id);
  }

  return NextResponse.json({ posted: posted.length, ids: posted });
}
