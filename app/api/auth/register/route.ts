import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { registerSchema } from '@/lib/validators';
import { createSession, hashPassword } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = registerSchema.parse(payload);
    const username = data.username.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'member';

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: await hashPassword(data.password),
        role
      }
    });

    await createSession(user.id);

    return NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } }, { status: 201 });
  } catch (error) {
    console.error('register_error', error);
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
