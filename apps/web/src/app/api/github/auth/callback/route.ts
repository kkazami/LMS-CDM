import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { encryptGithubToken } from '@/lib/github/token-vault';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Verify state against cookie
  const cookieState = req.cookies.get('github_oauth_state')?.value;
  if (!state || !cookieState || state !== cookieState) {
    return NextResponse.json({ error: 'Invalid or expired OAuth state.' }, { status: 403 });
  }

  if (!code) {
    return NextResponse.json({ error: 'Authorization code is missing.' }, { status: 400 });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${baseUrl}/api/github/auth/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'GitHub OAuth credentials unconfigured.' }, { status: 500 });
  }

  try {
    // Exchange auth code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return NextResponse.json(
        { error: tokenData.error_description || 'Failed to exchange token with GitHub.' },
        { status: 400 }
      );
    }

    const encrypted = encryptGithubToken(tokenData.access_token);
    const scope = tokenData.scope || 'repo,read:user';

    // Persist or update encrypted token in database
    await db.githubToken.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        encryptedToken: encrypted,
        scope,
        connectedAt: new Date(),
        lastUsedAt: new Date(),
      },
      update: {
        encryptedToken: encrypted,
        scope,
        connectedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    // Determine institute for redirect
    const user = session.user as { institute?: { code?: string } };
    const instituteCode = user.institute?.code || 'ics';
    const redirectUrl = new URL(`/${instituteCode}/settings?github=connected`, req.nextUrl.origin);

    const response = NextResponse.redirect(redirectUrl.toString());
    response.cookies.delete('github_oauth_state');
    return response;
  } catch (err: unknown) {
    console.error('Error during GitHub OAuth callback:', err);
    return NextResponse.json({ error: 'Internal server error during GitHub OAuth.' }, { status: 500 });
  }
}
