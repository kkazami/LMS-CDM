import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { getFileTree } from '@/lib/github/octokit-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string; sha: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, repo, sha } = await context.params;

  try {
    const tree = await getFileTree(session.user.id, owner, repo, sha);
    return NextResponse.json(tree);
  } catch (error: any) {
    console.error('Failed to proxy GitHub git tree:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tree from GitHub.' },
      { status: error.status || 500 }
    );
  }
}
