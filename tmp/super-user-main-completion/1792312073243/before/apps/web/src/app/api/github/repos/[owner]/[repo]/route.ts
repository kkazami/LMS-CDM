import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { getRepoMetadata } from '@/lib/github/octokit-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, repo } = await context.params;

  try {
    const metadata = await getRepoMetadata(session.user.id, owner, repo);
    return NextResponse.json(metadata);
  } catch (error: any) {
    console.error('Failed to proxy GitHub repo metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch repository metadata from GitHub.' },
      { status: error.status || 500 }
    );
  }
}
