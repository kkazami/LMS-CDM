import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { finishGoogle, googleConfig, saveGoogleProfile } from '@/lib/google-auth';
import { createSession } from '@/lib/auth-session';
import { canonicalRole, mayAdmitAccount } from '@/lib/super-user-v1/capabilities';
import { needsClassEnrollment } from '@/lib/student-access';
import { getClientIp } from '@/lib/rate-limit';

export async function GET(request: Request) {
  let origin: string;
  try { origin = googleConfig().origin; } catch { return Response.json({ message: 'Google sign-in is not configured.' }, { status: 503 }); }
  try {
    const profile = await finishGoogle(new URL(request.url));
    const user = await db.user.findUnique({ where: { googleSubject: profile.sub }, include: { institute: true } });
    if (!user) {
      // Completing the form proves an existing account's password before linking Google.
      await saveGoogleProfile(profile);
      return NextResponse.redirect(new URL('/register?google=1', origin));
    }
    if (canonicalRole(user.role) !== 'STUDENT' || !mayAdmitAccount(user) || user.institute.code !== profile.instituteCode) throw new Error('Account not available in this portal.');
    await createSession(user.id, { userAgent: request.headers.get('user-agent') || undefined, ipAddress: getClientIp(request) }, undefined, { role: user.role, instituteId: user.instituteId, credentialProvisioningState: user.credentialProvisioningState, googleSubject: profile.sub });
    return NextResponse.redirect(new URL(await needsClassEnrollment(user) ? '/join-class' : `/${user.institute.code}/students`, origin));
  } catch {
    return NextResponse.redirect(new URL('/login?googleError=1&force=true', origin));
  }
}
