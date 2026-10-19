import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { getCiStatus } from '@/lib/github/octokit-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, repo } = await context.params;
  const perPage = parseInt(req.nextUrl.searchParams.get('per_page') || '5', 10);

  try {
    const runs = await getCiStatus(session.user.id, owner, repo, perPage);
    return NextResponse.json(runs);
  } catch (error: any) {
    console.error('Failed to proxy GitHub CI workflow runs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch CI runs from GitHub.' },
      { status: error.status || 500 }
    );
  }
}
