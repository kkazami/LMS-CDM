import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const linkRepoSchema = z.object({
  postId: z.string().optional(),
  submissionId: z.string().optional(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().default('main'),
  commitSha: z.string().optional(),
  filePath: z.string().optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
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

    const repoLink = await db.githubRepoLink.create({
      data: {
        userId: session.user.id,
        postId: parsed.postId,
        submissionId: parsed.submissionId,
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch,
        commitSha: parsed.commitSha,
        filePath: parsed.filePath,
        lineStart: parsed.lineStart,
        lineEnd: parsed.lineEnd,
        visibility: parsed.visibility,
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
