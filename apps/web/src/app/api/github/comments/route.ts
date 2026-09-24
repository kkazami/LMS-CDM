import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const createCommentSchema = z.object({
  repoLinkId: z.string().min(1),
  filePath: z.string().min(1),
  lineNumber: z.number().int().positive(),
  body: z.string().min(1),
  parentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = createCommentSchema.parse(json);

    // Verify repo link exists
    const repoLink = await db.githubRepoLink.findUnique({
      where: { id: parsed.repoLinkId },
    });

    if (!repoLink) {
      return NextResponse.json({ error: 'Repository link not found' }, { status: 404 });
    }

    const comment = await db.githubInlineComment.create({
      data: {
        repoLinkId: parsed.repoLinkId,
        authorId: session.user.id,
        filePath: parsed.filePath,
        lineNumber: parsed.lineNumber,
        body: parsed.body,
        parentId: parsed.parentId,
      },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create inline comment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repoLinkId = req.nextUrl.searchParams.get('repoLinkId');
  const filePath = req.nextUrl.searchParams.get('filePath');

  if (!repoLinkId) {
    return NextResponse.json({ error: 'repoLinkId is required' }, { status: 400 });
  }

  const whereClause: Record<string, unknown> = {
    repoLinkId,
    parentId: null, // Root comments
  };

  if (filePath) {
    whereClause.filePath = filePath;
  }

  const comments = await db.githubInlineComment.findMany({
    where: whereClause,
    include: {
      author: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      replies: {
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { lineNumber: 'asc' },
  });

  return NextResponse.json(comments);
}
