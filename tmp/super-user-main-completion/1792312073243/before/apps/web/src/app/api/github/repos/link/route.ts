import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const linkRepoSchema = z.object({
  postId: z.string().nullish(),
  submissionId: z.string().nullish(),
  owner: z.string().trim().min(1, 'Repository owner is required'),
  repo: z.string().trim().min(1, 'Repository name is required'),
  branch: z.string().nullish().transform((b) => b?.trim() || 'main'),
  commitSha: z.string().nullish(),
  filePath: z.string().nullish(),
  lineStart: z.coerce.number().int().positive().nullish(),
  lineEnd: z.coerce.number().int().positive().nullish(),
  visibility: z.enum(['cohort', 'instructor_only', 'anonymous']).default('cohort'),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = linkRepoSchema.parse(body);

    const cleanOwner = parsed.owner.replace(/^https?:\/\/(?:www\.)?github\.com\//i, '').split('/')[0].trim();
    const cleanRepo = parsed.repo.replace(/\.git$/i, '').trim();
    const cleanFilePath = parsed.filePath ? parsed.filePath.trim().replace(/^\/+/, '') : null;

    const repoLink = await db.githubRepoLink.create({
      data: {
        userId: session.user.id,
        postId: parsed.postId || null,
        submissionId: parsed.submissionId || null,
        owner: cleanOwner,
        repo: cleanRepo,
        branch: parsed.branch || 'main',
        commitSha: parsed.commitSha || null,
        filePath: cleanFilePath || null,
        lineStart: parsed.lineStart || null,
        lineEnd: parsed.lineEnd || null,
        visibility: parsed.visibility,
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
        ciResults: {
          take: 3,
          orderBy: { fetchedAt: 'desc' },
        },
      },
    });

    return NextResponse.json(repoLink, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to link GitHub repo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const postId = req.nextUrl.searchParams.get('postId');
  const user = session.user as { role: string; instituteId: string };
  const isInstructorOrAdmin = user.role === 'PROFESSOR' || user.role === 'ADMIN' || user.role === 'TEACHER';

  const whereClause: Record<string, unknown> = {};
  if (postId) {
    whereClause.postId = postId;
  } else {
    whereClause.userId = session.user.id;
  }

  const links = await db.githubRepoLink.findMany({
    where: whereClause,
    include: {
      user: {
        select: { id: true, name: true, avatarUrl: true, role: true },
      },
      ciResults: {
        take: 3,
        orderBy: { fetchedAt: 'desc' },
      },
    },
    orderBy: { linkedAt: 'desc' },
  });

  // Filter based on visibility
  const accessibleLinks = links.filter((link) => {
    if (link.userId === session.user.id) return true;
    if (link.visibility === 'instructor_only' && !isInstructorOrAdmin) return false;
    return true;
  });

  // Mask user if anonymous
  const maskedLinks = accessibleLinks.map((link) => {
    if (link.visibility === 'anonymous' && link.userId !== session.user.id && !isInstructorOrAdmin) {
      return {
        ...link,
        user: { id: 'anonymous', name: 'Anonymous Contributor', avatarUrl: null, role: 'STUDENT' },
      };
    }
    return link;
  });

  return NextResponse.json(maskedLinks);
}
