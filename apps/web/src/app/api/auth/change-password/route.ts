import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-session';
import { compare, hash } from 'bcryptjs';
import { passwordSchema } from '@/lib/auth-schema';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';

export async function POST(req: Request) {
  const denial = await denyLegacyApi(req, 'POST auth/change-password/route.ts');
  if (denial) return denial;
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const parsed = passwordSchema.safeParse(body.newPassword);
    if (!parsed.success || typeof body.currentPassword !== 'string' || body.currentPassword.length > 1024) return NextResponse.json({ error: parsed.success ? 'Invalid current password.' : parsed.error.issues[0].message }, { status: 400 });
    const user = await db.user.findUnique({ where: { id: session.userId }, select: { password: true } });
    if (!user?.password || !await compare(body.currentPassword, user.password)) return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    const password = await hash(parsed.data, 10);
    const changed = await db.$transaction(async tx => {
      await lockAccounts(tx, [session.userId]);
      const active = await tx.session.findFirst({ where: { id: session.id, userId: session.userId, tokenHash: session.tokenHash } });
      if (!active) return false;
      const result = await tx.user.updateMany({ where: { id: session.userId, password: user.password }, data: { password } });
      if (!result.count) return false;
      await tx.session.deleteMany({ where: { userId: session.userId } });
      return true;
    });
    if (!changed) return NextResponse.json({ error: 'Your session or password changed. Sign in again.' }, { status: 409 });
    const response = NextResponse.json({ success: true, message: 'Password updated. Sign in again on your devices.' });
    response.cookies.set('lumina_session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to change password.' }, { status: 400 });
  }
}
