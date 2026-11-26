import { NextResponse } from 'next/server';
import { bearerToken, validateSessionToken } from '@/lib/auth-session';
import { needsClassEnrollment } from '@/lib/student-access';
import { mobileFeaturePath } from '@/lib/mobile-feature-path';
import { currentSessionCookiePolicy, sessionCookieAttributes, SESSION_COOKIE_NAMES } from '@/lib/session-cookie';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', Vary: 'Authorization' };

/** Put an already-issued native session into the WebView's HttpOnly cookie jar. */
export async function GET(request: Request) {
  const token = bearerToken(request.headers.get('authorization'));
  if (!token) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401, headers });
  // Validate this bearer explicitly; a stale WebView cookie must never select another account.
  const session = await validateSessionToken(token);
  if (!session) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401, headers });
  const target = mobileFeaturePath(new URL(request.url).searchParams.get('returnTo'));
  if (!target) return NextResponse.json({ error: 'Invalid mobile workspace.' }, { status: 400, headers });
  const targetInstitute = target.startsWith('/ibe/') ? 'ibe' : 'ics';
  if (session.user.institute.code.toLowerCase() !== targetInstitute || !['STUDENT', 'PROFESSOR', 'TEACHER'].includes(session.user.role)
    || await needsClassEnrollment(session.user)) {
    return NextResponse.json({ error: `This workspace is available to enrolled ${targetInstitute.toUpperCase()} students and faculty.` }, { status: 403, headers });
  }
  const reqUrl = new URL(request.url);
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? reqUrl.protocol.replace(/:$/, '');
  const baseOrigin = forwardedHost && !forwardedHost.startsWith('0.0.0.0')
    ? `${forwardedProto}://${forwardedHost}`
    : reqUrl.origin;
  // Every destination still enforces its own role, institute and course access.
  const response = NextResponse.redirect(new URL(target, baseOrigin), 303);
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  const { write } = currentSessionCookiePolicy();
  for (const name of SESSION_COOKIE_NAMES) {
    if (name !== write) response.cookies.set(name, '', { ...sessionCookieAttributes(name), maxAge: 0 });
  }
  response.cookies.set(write, token, { ...sessionCookieAttributes(write), expires: session.expiresAt });
  return response;
}
