import { NextResponse } from 'next/server';
import { hash, compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { studentRegistrationSchema, googleLinkSchema } from '@/lib/auth-schema';
import { createSession } from '@/lib/auth-session';
import { clearGoogleProfile, readGoogleProfile } from '@/lib/google-auth';
import { needsClassEnrollment } from '@/lib/student-access';
import { mutationOriginAllowed } from '@/lib/request-security';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { canonicalRole, mayAdmitAccount } from '@/lib/super-user-v1/capabilities';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { boundedJson } from '@/lib/roster/policy';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { getClientIp } from '@/lib/rate-limit';
import { getCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export async function OPTIONS(request: Request) { return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 }); }
export async function POST(request: Request) {
  try {
    if (!mutationOriginAllowed(request)) throw new AccessError(403, 'Forbidden request origin.');
    await persistentLimit('register-ip:' + getClientIp(request), 10, 60 * 60 * 1000);
    const body = await boundedJson(request, 8192) as { google?: unknown };
    const profile = body?.google === true ? await readGoogleProfile() : null;
    if (body?.google === true && !profile) throw new AccessError(400, 'Google sign-in expired. Start again.');
    const linking = profile && await db.user.findFirst({ where: { email: { equals: profile.email, mode: 'insensitive' } }, select: { id: true } });
    const parsed = (linking ? googleLinkSchema : studentRegistrationSchema).safeParse(body);
    if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message, errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    const data = parsed.data;
    if (profile && profile.email !== data.email) throw new AccessError(400, 'Use the email verified by Google.');
    const institute = await db.institute.findUnique({ where: { code: data.instituteCode } });
    if (!institute) throw new AccessError(400, 'Institute is not available.');
    const password = await hash(data.password, 12);
    const user = await db.$transaction(async tx => {
      // Serialize normalized email/ID claims, including concurrent Google completion.
      for (const value of [data.email, data.studentNumber].sort()) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${value}, 0))`;
      const existing = await tx.user.findFirst({ where: { OR: [{ email: { equals: data.email, mode: 'insensitive' } }, { studentNumber: data.studentNumber }] } });
      if (existing) {
        await lockAccounts(tx, [existing.id]);
        const current = await tx.user.findUniqueOrThrow({ where: { id: existing.id } });
        if (!profile || current.email.toLowerCase() !== data.email || (current.studentNumber || current.uniqueId) !== data.studentNumber || current.instituteId !== institute.id || canonicalRole(current.role) !== 'STUDENT' || !mayAdmitAccount(current) || !current.password || !await compare(data.password, current.password) || current.googleSubject && current.googleSubject !== profile.sub) throw new AccessError(409, 'An account already uses this email or student ID. Sign in with that account or contact the Registrar.');
        return tx.user.update({ where: { id: current.id }, data: { googleSubject: profile.sub } });
      }
      if (linking) throw new AccessError(409, 'Your existing account changed. Start Google sign-in again.');
      return tx.user.create({ data: { name: data.name, email: data.email, studentNumber: data.studentNumber, uniqueId: data.studentNumber, password, googleSubject: profile?.sub ?? null, role: 'STUDENT', instituteId: institute.id, isActive: true, activationStatus: 'ACTIVE', activatedAt: new Date() } });
    });
    const { token, expiresAt } = await createSession(user.id, { userAgent: request.headers.get('user-agent') || undefined, ipAddress: getClientIp(request) }, user.password!, { role: user.role, instituteId: user.instituteId, credentialProvisioningState: user.credentialProvisioningState });
    await clearGoogleProfile();
    const requiresEnrollment = await needsClassEnrollment(user);
    return NextResponse.json({ message: 'Account ready.', token, expiresAt: expiresAt.toISOString(), redirectTo: requiresEnrollment ? '/join-class' : `/${institute.code}/students`, user: { id: user.id, name: user.name, email: user.email, studentNumber: user.studentNumber, role: user.role, requiresEnrollment, instituteId: institute.id, institute: { code: institute.code, name: institute.name } } }, { status: 200, headers: getCorsHeaders(request) });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') return Response.json({ message: 'An account already uses this email or student ID.' }, { status: 409 });
    return accountErrorResponse(error);
  }
}
