import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { getCommitHistory } from '@/lib/github/octokit-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, repo } = await context.params;
  const branch = req.nextUrl.searchParams.get('branch') || undefined;
  const perPage = parseInt(req.nextUrl.searchParams.get('per_page') || '30', 10);

  try {
    const commits = await getCommitHistory(session.user.id, owner, repo, branch, perPage);
    return NextResponse.json(commits);
  } catch (error: any) {
    console.error('Failed to proxy GitHub commits:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch commits from GitHub.' },
      { status: error.status || 500 }
    );
  }
}
