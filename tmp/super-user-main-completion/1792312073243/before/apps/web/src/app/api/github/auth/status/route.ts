import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { getOctokitForUser } from '@/lib/github/octokit-client';

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tokenRecord = await db.githubToken.findUnique({
    where: { userId: session.user.id },
  });

  if (!tokenRecord) {
    return NextResponse.json({
      connected: false,
    });
  }

  // Attempt to fetch GitHub profile to verify token validity
  let username: string | null = null;
  let avatarUrl: string | null = null;

  try {
    const octokit = await getOctokitForUser(session.user.id);
    const { data } = await octokit.users.getAuthenticated();
    username = data.login;
    avatarUrl = data.avatar_url;
  } catch (e) {
    console.warn('Failed to verify token validity with GitHub:', e);
  }

  return NextResponse.json({
    connected: true,
    username,
    avatarUrl,
    scope: tokenRecord.scope,
    connectedAt: tokenRecord.connectedAt,
    lastUsedAt: tokenRecord.lastUsedAt,
  });
}
