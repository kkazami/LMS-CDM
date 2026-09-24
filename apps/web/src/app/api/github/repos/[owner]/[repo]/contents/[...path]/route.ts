import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { getFileContents } from '@/lib/github/octokit-client';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ owner: string; repo: string; path: string[] }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { owner, repo, path: pathArray } = await context.params;
  const filePath = pathArray.join('/');
  const ref = req.nextUrl.searchParams.get('ref') || undefined;

  try {
    const result = await getFileContents(session.user.id, owner, repo, filePath, ref);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to proxy GitHub file contents:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file contents from GitHub.' },
      { status: error.status || 500 }
    );
  }
}
