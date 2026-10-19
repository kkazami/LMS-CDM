import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const comment = await db.githubInlineComment.findUnique({
    where: { id },
    include: { repoLink: true },
  });

  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  const user = session.user as { role: string };
  const isAuthor = comment.authorId === session.user.id;
  const isRepoOwner = comment.repoLink.userId === session.user.id;
  const isInstructorOrAdmin = user.role === 'PROFESSOR' || user.role === 'ADMIN' || user.role === 'TEACHER';

  if (!isAuthor && !isRepoOwner && !isInstructorOrAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await db.githubInlineComment.update({
    where: { id },
    data: { resolved: true },
  });

  return NextResponse.json(updated);
}
