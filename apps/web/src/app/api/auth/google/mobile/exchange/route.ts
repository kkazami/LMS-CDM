import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession } from '@/lib/auth-session';
import { openGoogleMobile, googleMobileVerifierHash, googleMobileHeaders } from '@/lib/google-mobile';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { getClientIp } from '@/lib/rate-limit';
import { mutationOriginAllowed } from '@/lib/request-security';
import { boundedJson } from '@/lib/roster/policy';
import { mayAdmitAccount } from '@/lib/super-user-v1/capabilities';

const input = z.object({ ticket: z.string().min(32).max(8192), verifier: z.string().regex(/^[a-f0-9]{64}$/) });
export async function POST(request: Request) {
  try {
    if (!mutationOriginAllowed(request)) return Response.json({ message: 'Forbidden.' }, { status: 403 });
    await persistentLimit('google-mobile-exchange:' + getClientIp(request), 30, 15 * 60000);
    const body = input.parse(await boundedJson(request, 10000));
    const ticket = await openGoogleMobile(body.ticket, 'mobile-exchange');
    if (ticket.challenge !== googleMobileVerifierHash(body.verifier) || typeof ticket.sessionId !== 'string' || typeof ticket.tokenHash !== 'string') throw new Error('Invalid sign-in proof.');
    const session = await db.session.findUnique({ where: { id: ticket.sessionId }, include: { user: { include: { institute: true } } } });
    if (!session || session.tokenHash !== ticket.tokenHash || session.expiresAt <= new Date() || !mayAdmitAccount(session.user) || session.user.role !== 'STUDENT' || session.user.googleSubject !== ticket.sub || session.user.institute.code !== ticket.instituteCode) throw new Error('Sign-in expired.');
    // Atomic consumption prevents a second redemption, including concurrent requests.
    const used = await db.session.deleteMany({ where: { id: session.id, tokenHash: session.tokenHash, expiresAt: { gt: new Date() } } });
    if (used.count !== 1) throw new Error('Sign-in already used.');
    const user = session.user;
    const result = await createSession(user.id, { userAgent: request.headers.get('user-agent') || undefined, ipAddress: getClientIp(request) }, undefined, { role: user.role, instituteId: user.instituteId, credentialProvisioningState: user.credentialProvisioningState, googleSubject: user.googleSubject });
    return Response.json({ token: result.token }, { headers: googleMobileHeaders });
  } catch { return Response.json({ message: 'Google sign-in expired or could not be verified. Please start again.' }, { status: 400, headers: googleMobileHeaders }); }
}
