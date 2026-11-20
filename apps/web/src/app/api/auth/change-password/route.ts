import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-session';
import { compare, hash } from 'bcryptjs';
import { hashArgonPassword, ordinaryPasswordPolicyError, verifyAccountPassword } from '@/lib/password-hashing';
import { passwordPilotBlocklist, passwordWritePilotEnabled } from '@/lib/password-write-pilot';
import { passwordSchema } from '@/lib/auth-schema';
import { SESSION_COOKIE_NAMES, sessionCookieAttributes } from '@/lib/session-cookie';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { AccessError } from '@/lib/super-user-v1/actor';
import { limitAuthenticatedOperation } from '@/lib/authenticated-rate-limits';
import { sessionExpired } from '@/lib/session-policy';

const headers = { 'Cache-Control': 'private, no-store' };

function reject(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(req: Request) {
  const denial = await denyLegacyApi(req, 'POST auth/change-password/route.ts');
  if (denial) {
    denial.headers.set('Cache-Control', headers['Cache-Control']);
    return denial;
  }
  try {
    const session = await getSession(req);
    if (!session) return reject('Unauthorized', 401);
    const body = await req.json().catch(() => null);
    if (typeof body?.newPassword !== 'string' || body.newPassword.length > 1024 ||
        typeof body.currentPassword !== 'string' || !body.currentPassword.length || body.currentPassword.length > 1024) {
      return reject('Enter the current and new password.', 400);
    }
    const pilot = passwordWritePilotEnabled(session.user.role);
    if (pilot) {
      const message = ordinaryPasswordPolicyError(body.newPassword, await passwordPilotBlocklist());
      if (message) return reject(message, 400);
    } else {
      const parsed = passwordSchema.safeParse(body.newPassword);
      if (!parsed.success) return reject(parsed.error.issues[0].message, 400);
    }
    await limitAuthenticatedOperation('passwordChange', session.userId);
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: { password: true, securityPin: true },
    });
    if (!user?.password || !(await verifyAccountPassword(body.currentPassword, user.password))) {
      return reject('Incorrect current password', 400);
    }
    // Verify PIN if set
    if (user.securityPin) {
      if (typeof body.pin !== 'string' || !/^\d{6}$/.test(body.pin)) {
        return reject('A valid six-digit Security PIN is required', 400);
      }
      const isPinValid = await compare(body.pin, user.securityPin);
      if (!isPinValid) {
        return reject('Incorrect Security PIN', 400);
      }
    }
    if (!pilot && user.password.startsWith('$argon2id$')) return reject('Password changes are temporarily unavailable for this account.', 503);
    const password = pilot ? await hashArgonPassword(body.newPassword) : await hash(body.newPassword, 10);
    const changed = await db.$transaction(async tx => {
      await lockAccounts(tx, [session.userId]);
      const active = await tx.session.findFirst({ where: { id: session.id, userId: session.userId, tokenHash: session.tokenHash } });
      if (!active || sessionExpired(active)) return false;
      const result = await tx.user.updateMany({
        where: { id: session.userId, password: user.password, securityPin: user.securityPin, role: session.user.role, isActive: true },
        data: { password },
      });
      if (!result.count) return false;
      await tx.session.deleteMany({ where: { userId: session.userId } });
      await tx.auditLog.create({
        data: { adminId: session.userId, targetId: session.userId, action: 'SELF_PASSWORD_CHANGED',
          metadata: JSON.stringify({ outcome: 'UPDATED' }) },
      });
      return true;
    });
    if (!changed) return reject('Your session or password changed. Sign in again.', 409);
    const response = NextResponse.json({ success: true, message: 'Password updated. Sign in again on your devices.' }, { headers });
    for (const name of SESSION_COOKIE_NAMES) response.cookies.set(name, '', { ...sessionCookieAttributes(name), maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof AccessError && error.status === 429) return reject(error.message, 429);
    return reject('Unable to change password right now.', 503);
  }
}
