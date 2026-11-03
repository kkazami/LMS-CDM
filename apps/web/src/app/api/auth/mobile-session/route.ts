import { NextResponse } from 'next/server';
import { bearerToken, validateSessionToken } from '@/lib/auth-session';
import { needsClassEnrollment } from '@/lib/student-access';
import { mobileFeaturePath } from '@/lib/mobile-feature-path';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', Vary: 'Authorization' };

/** Put an already-issued native session into the WebView's HttpOnly cookie jar. */
export async function GET(request: Request) {
  const token = bearerToken(request.headers.get('authorization'));
  if (!token) return NextResponse.json({ error: 'Sign in to continue.' }, { status: 401, headers });
  // Validate this bearer explicitly; a stale WebView cookie must never select another account.
  const session = await validateSessionToken(token);
  if (!session) return NextResponse.json({ error: 'Your session has expired. Sign in again.' }, { status: 401, headers });
  if (session.user.institute.code.toLowerCase() !== 'ics' || !['STUDENT', 'PROFESSOR', 'TEACHER'].includes(session.user.role)
    || await needsClassEnrollment(session.user)) {
    return NextResponse.json({ error: 'This workspace is available to enrolled ICS students and faculty.' }, { status: 403, headers });
  }
  const target = mobileFeaturePath(new URL(request.url).searchParams.get('returnTo'));
  if (!target) return NextResponse.json({ error: 'Invalid mobile workspace.' }, { status: 400, headers });
  // Every destination still enforces its own role, institute and course access.
  const response = NextResponse.redirect(new URL(target, request.url), 303);
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  response.cookies.set('lumina_session', token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: session.expiresAt,
  });
  return response;
}
