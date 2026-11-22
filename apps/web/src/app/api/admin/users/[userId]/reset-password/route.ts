import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
/**
 * Admin Password Reset API
 *
 * POST /api/admin/users/[userId]/reset-password
 *
 * Generates a new temporary password, hashes it, purges sessions,
 * and returns the plaintext password once for admin to share.
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth-session';
import { administratorInstitute } from '@/lib/administrator-scope';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError, revalidateActor } from '@/lib/super-user-v1/actor';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { hashArgonPassword, ordinaryPasswordPolicyError } from '@/lib/password-hashing';
import { passwordPilotBlocklist, passwordWritePilotEnabled } from '@/lib/password-write-pilot';
import { limitAuthenticatedOperation } from '@/lib/authenticated-rate-limits';
import { AUDIT_ACTIONS } from '@/lib/admin-types';

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

const headers = { 'Cache-Control': 'private, no-store' };

function reply(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers });
}

export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST admin/users/[userId]/reset-password/route.ts");
  if (ceilingDenial) {
    ceilingDenial.headers.set('Cache-Control', headers['Cache-Control']);
    return ceilingDenial;
  }

  try {
    const session = await getSession(request);
    if (!session) return reply('Authentication required.', 401);
    await administratorInstitute(session.user);
    const { userId } = await context.params;
    const body = request.body ? await request.json().catch(() => null) : {};
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        (body.newPassword !== undefined && (typeof body.newPassword !== 'string' || body.newPassword.length > 1024))) {
      return reply('Invalid temporary password.', 400);
    }

    const target = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, instituteId: true, activationStatus: true, password: true },
    });
    if (!target || target.instituteId !== session.user.instituteId) return reply('User not found.', 404);
    if (!['INSTRUCTOR', 'STUDENT'].includes(canonicalRole(target.role))) return reply('Only instructors and students may be managed.', 403);
    if (target.activationStatus !== 'ACTIVE') return reply('This account must be activated by its owner. Send an activation invitation instead.', 409);

    const pilot = passwordWritePilotEnabled(target.role);
    if (!pilot && target.password?.startsWith('$argon2id$')) {
      return reply('Password reset is temporarily unavailable for this account.', 503);
    }
    const rawPassword = body.newPassword ?? randomBytes(18).toString('base64url');
    if (pilot) {
      const message = ordinaryPasswordPolicyError(rawPassword, await passwordPilotBlocklist());
      if (message) return reply(message, 400);
    } else if (rawPassword.length < 6 || Buffer.byteLength(rawPassword, 'utf8') > 72) {
      return reply('Password must be at least 6 characters and at most 72 UTF-8 bytes.', 400);
    }
    await limitAuthenticatedOperation('adminPasswordReset', session.user.id);
    const password = pilot ? await hashArgonPassword(rawPassword) : await hash(rawPassword, 10);
    const actor = { id: session.user.id, sessionId: session.id, tokenHash: session.tokenHash };
    const changed = await db.$transaction(async tx => {
      await lockAccounts(tx, [actor.id, userId]);
      const administrator = await revalidateActor(tx, actor, ['ADMIN']);
      if (administrator.instituteId !== target.instituteId) throw new AccessError(403, 'Forbidden institute.');
      const result = await tx.user.updateMany({
        where: { id: userId, instituteId: target.instituteId, role: target.role, activationStatus: 'ACTIVE', password: target.password },
        data: { password },
      });
      if (!result.count) return false;
      await tx.session.deleteMany({ where: { userId } });
      await tx.auditLog.create({
        data: { adminId: administrator.id, targetId: userId, action: AUDIT_ACTIONS.PASSWORD_RESET,
          metadata: JSON.stringify({ instituteId: target.instituteId, outcome: 'RESET',
            method: body.newPassword === undefined ? 'auto-generated' : 'admin-specified' }) },
      });
      return true;
    });
    if (!changed) return reply('The account changed. Refresh before trying again.', 409);
    return NextResponse.json({
      message: 'Password reset successfully. Share this temporary password securely.',
      temporaryPassword: rawPassword,
      note: 'This password is shown only once. The user should change it upon next login.',
    }, { headers });
  } catch (error) {
    if (error instanceof AccessError && error.status < 500) return reply(error.message, error.status);
    return reply('Unable to reset the password right now.', 503);
  }
}
