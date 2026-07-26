import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const where: any = {};
  if (user.role !== 'admin') {
    where.userId = user.id;
  }

  const [pending, processing, processed, error] = await Promise.all([
    prisma.rawQueue.count({ where: { ...where, status: 'PENDING' } }),
    prisma.rawQueue.count({ where: { ...where, status: 'PROCESSING' } }),
    prisma.rawQueue.count({ where: { ...where, status: 'PROCESSED' } }),
    prisma.rawQueue.count({ where: { ...where, status: 'ERROR' } }),
  ]);

  return NextResponse.json({
    PENDING: pending,
    PROCESSING: processing,
    PROCESSED: processed,
    ERROR: error,
  });
}
