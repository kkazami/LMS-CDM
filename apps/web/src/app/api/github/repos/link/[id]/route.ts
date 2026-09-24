import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const link = await db.githubRepoLink.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      ciResults: {
        orderBy: { fetchedAt: 'desc' },
        take: 5,
      },
    },
  });

  if (!link) {
    return NextResponse.json({ error: 'Repository link not found' }, { status: 404 });
  }

  const user = session.user as { role: string };
  const isOwner = link.userId === session.user.id;
  const isInstructorOrAdmin = user.role === 'PROFESSOR' || user.role === 'ADMIN' || user.role === 'TEACHER';

  if (link.visibility === 'instructor_only' && !isOwner && !isInstructorOrAdmin) {
    return NextResponse.json({ error: 'Forbidden: instructor only visibility.' }, { status: 403 });
  }

  const result = {
    ...link,
    user: (link.visibility === 'anonymous' && !isOwner && !isInstructorOrAdmin)
      ? { id: 'anonymous', name: 'Anonymous Contributor', avatarUrl: null, role: 'STUDENT' }
      : link.user,
  };

  return NextResponse.json(result);
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const link = await db.githubRepoLink.findUnique({
    where: { id },
  });

  if (!link) {
    return NextResponse.json({ error: 'Repository link not found' }, { status: 404 });
  }

  const user = session.user as { role: string };
  const isOwner = link.userId === session.user.id;
  const isAdmin = user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Only the owner or admin can delete this link.' }, { status: 403 });
  }

  await db.githubRepoLink.delete({
    where: { id },
  });

  return new NextResponse(null, { status: 204 });
}
