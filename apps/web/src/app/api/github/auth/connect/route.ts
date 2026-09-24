import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'GITHUB_CLIENT_ID is not configured on the server.' },
      { status: 500 }
    );
  }

  // Generate random CSRF state token
  const state = crypto.randomUUID();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${baseUrl}/api/github/auth/callback`;

  // Allow requesting downscoped public_repo if query param is set
  const requestScope = req.nextUrl.searchParams.get('scope') === 'public_repo'
    ? 'public_repo,read:user,user:email'
    : 'repo,read:user,user:email';

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', clientId);
  githubAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  githubAuthUrl.searchParams.set('scope', requestScope);
  githubAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(githubAuthUrl.toString());

  // Store state in secure HTTP-only cookie
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return response;
}
