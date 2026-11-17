import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { z } from 'zod';
import { createSession } from '@/lib/auth-session';
import { ADMIN_MFA_COOKIE, ADMIN_MFA_COOKIE_PATH, adminMfaStatus, prepareAdminMfa, verifyAdminMfa, acknowledgeAdminMfaRecovery, adminMfaCompletionIdentity, cancelAdminMfa } from '@/lib/admin-mfa';
import { AdminMfaError } from '@/lib/admin-mfa-crypto';
import { boundedJson } from '@/lib/roster/policy';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { getClientIp } from '@/lib/rate-limit';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError } from '@/lib/super-user-v1/actor';

export const dynamic = 'force-dynamic';
const safeHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' };
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('enroll') }).strict(),
  z.object({ action: z.literal('verify'), code: z.string().trim().min(6).max(64), recovery: z.boolean().default(false) }).strict(),
  z.object({ action: z.literal('acknowledge'), savedRecoveryCodes: z.literal(true) }).strict(),
  z.object({ action: z.literal('complete') }).strict(),
  z.object({ action: z.literal('cancel') }).strict(),
]);
async function challenge() {
  const value = (await cookies()).get(ADMIN_MFA_COOKIE)?.value;
  if (!value) throw new AdminMfaError(401, 'Sign in again to verify your authenticator.');
  return value;
}
function failure(error: unknown) {
  const known = error instanceof AdminMfaError || error instanceof AccessError;
  return NextResponse.json({ message: known ? error.message : error instanceof z.ZodError ? 'Invalid verification request.' : 'Administrator MFA is temporarily unavailable.' }, { status: known ? error.status : error instanceof z.ZodError ? 400 : 503, headers: safeHeaders });
}
async function finish(rawToken: string, request: Request) {
  const userAgent = request.headers.get('user-agent') ?? undefined;
  const user = await adminMfaCompletionIdentity(rawToken, userAgent);
  const session = await createSession(user.id, { userAgent, ipAddress: getClientIp(request) }, undefined,
    { role: user.role, instituteId: user.instituteId, credentialProvisioningState: user.credentialProvisioningState, googleSubject: user.googleSubject }, rawToken);
  (await cookies()).set(ADMIN_MFA_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: ADMIN_MFA_COOKIE_PATH, maxAge: 0 });
  const role = canonicalRole(user.role), institute = role === 'SUPER_USER' ? 'ics' : user.institute.code;
  return NextResponse.json({ complete: true, redirect: `/${institute}/${role === 'SUPER_USER' ? 'academic-operations' : 'admin'}`, expiresAt: session.expiresAt.toISOString() }, { headers: safeHeaders });
}
export async function GET(request: Request) {
  try { return NextResponse.json(await adminMfaStatus(await challenge(), request.headers.get('user-agent')), { headers: safeHeaders }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const target = new URL(request.url);
    const origin = request.headers.get('origin'), host = request.headers.get('host') || target.host;
    if (origin !== `${target.protocol}//${host}` || ![null, 'same-origin', 'none'].includes(request.headers.get('sec-fetch-site'))) throw new AdminMfaError(403, 'Forbidden origin.');
    const rawToken = await challenge(), userAgent = request.headers.get('user-agent');
    const body = input.parse(await boundedJson(request, 4096));
    await persistentLimit('admin-mfa-ip:' + getClientIp(request), 40, 15 * 60000);
    const identity = await adminMfaCompletionIdentity(rawToken, userAgent);
    await persistentLimit('admin-mfa-account:' + identity.id, 10, 5 * 60000);
    if (body.action === 'cancel') {
      await cancelAdminMfa(rawToken, userAgent);
      (await cookies()).set(ADMIN_MFA_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: ADMIN_MFA_COOKIE_PATH, maxAge: 0 });
      return NextResponse.json({ complete: false }, { headers: safeHeaders });
    }
    if (body.action === 'enroll') {
      const setup = await prepareAdminMfa(rawToken, userAgent);
      return NextResponse.json({ secret: setup.secret, qr: await QRCode.toDataURL(setup.uri, { width: 240, margin: 2 }) }, { headers: safeHeaders });
    }
    if (body.action === 'acknowledge') {
      await acknowledgeAdminMfaRecovery(rawToken, userAgent);
      return await finish(rawToken, request);
    }
    if (body.action === 'complete') return await finish(rawToken, request);
    const result = await verifyAdminMfa(rawToken, body.code, body.recovery, userAgent);
    (await cookies()).set(ADMIN_MFA_COOKIE, result.rawToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: ADMIN_MFA_COOKIE_PATH, maxAge: 120 });
    if (result.enrollment) return NextResponse.json({ recoveryCodes: result.recoveryCodes, recoveryAcknowledgmentRequired: true }, { headers: safeHeaders });
    return NextResponse.json({ verified: true }, { headers: safeHeaders });
  } catch (error) { return failure(error); }
}
