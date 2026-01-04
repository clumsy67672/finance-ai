import { NextResponse } from 'next/server';
import { destroySession, getSessionTokenFromRequest } from '@/lib/auth';

export async function POST() {
  const token = await getSessionTokenFromRequest();
  if (token) {
    await destroySession(token);
  }
  return NextResponse.json({ success: true });
}
