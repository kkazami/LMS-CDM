import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { getFileTree, getFileContents } from '@/lib/github/octokit-client';
import { createSubmissionSnapshot } from '@/lib/github/snapshot-service';
import { compareSubmissions, CodeFile } from '@/lib/github/similarity-service';

const submitRepoSchema = z.object({
  syllabusItemId: z.string().min(1),
  repoLinkId: z.string().min(1),
  commitSha: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = submitRepoSchema.parse(json);

    // Verify repo link
    const repoLink = await db.githubRepoLink.findUnique({
      where: { id: parsed.repoLinkId },
    });

    if (!repoLink || repoLink.userId !== session.user.id) {
      return NextResponse.json({ error: 'Repository link not found or unauthorized' }, { status: 404 });
    }

    // Determine attempt number
    const priorAttempts = await db.githubSubmission.count({
      where: {
        syllabusItemId: parsed.syllabusItemId,
        userId: session.user.id,
      },
    });

    // Check if late against SyllabusItem dueDate
    const syllabusItem = await db.syllabusItem.findUnique({
      where: { id: parsed.syllabusItemId },
    });

    const isLate = syllabusItem?.dueDate ? new Date() > syllabusItem.dueDate : false;

    // Create submission record
    const submission = await db.githubSubmission.create({
      data: {
        syllabusItemId: parsed.syllabusItemId,
        userId: session.user.id,
        repoLinkId: parsed.repoLinkId,
        commitSha: parsed.commitSha,
        isLate,
        attemptNumber: priorAttempts + 1,
      },
    });

    // Asynchronously take snapshot & run similarity check
    (async () => {
      try {
        const tree = await getFileTree(session.user.id, repoLink.owner, repoLink.repo, parsed.commitSha);
        const codeFiles: CodeFile[] = [];

        // Filter text blobs under 1MB
        const blobs = tree.filter(
          (f) => f.type === 'blob' && f.path && (f.size || 0) < 1_000_000
        );

        for (const blob of blobs.slice(0, 50)) {
          if (!blob.path) continue;
          try {
            const fileData = await getFileContents(
              session.user.id,
              repoLink.owner,
              repoLink.repo,
              blob.path,
              parsed.commitSha
            );
            codeFiles.push({ path: blob.path, content: fileData.content });
          } catch (err) {
            console.warn(`Could not load blob ${blob.path} for snapshot:`, err);
          }
        }

        // 1. Create snapshot zip archive
        const snapshot = await createSubmissionSnapshot(
          submission.id,
          parsed.commitSha,
          codeFiles
        );

        await db.githubSubmission.update({
          where: { id: submission.id },
          data: { snapshotPath: snapshot.snapshotPath },
        });

        // 2. Similarity analysis against existing submissions for the same syllabus item
        const otherSubmissions = await db.githubSubmission.findMany({
          where: {
            syllabusItemId: parsed.syllabusItemId,
            id: { not: submission.id },
          },
          include: {
            repoLink: true,
          },
        });

        for (const other of otherSubmissions) {
          try {
            const otherTree = await getFileTree(
              other.userId,
              other.repoLink.owner,
              other.repoLink.repo,
              other.commitSha
            );

            const otherFiles: CodeFile[] = [];
            const otherBlobs = otherTree.filter(
              (f) => f.type === 'blob' && f.path && (f.size || 0) < 1_000_000
            );

            for (const b of otherBlobs.slice(0, 50)) {
              if (!b.path) continue;
              const f = await getFileContents(
                other.userId,
                other.repoLink.owner,
                other.repoLink.repo,
                b.path,
                other.commitSha
              );
              otherFiles.push({ path: b.path, content: f.content });
            }

            const simResult = compareSubmissions(codeFiles, otherFiles, 80.0);

            // Ensure ordered pair to avoid duplicate key violations
            const [subA, subB] = submission.id < other.id
              ? [submission.id, other.id]
              : [other.id, submission.id];

            await db.submissionSimilarity.create({
              data: {
                submissionAId: subA,
                submissionBId: subB,
                score: simResult.score,
                flagged: simResult.flagged,
              },
            });
          } catch (simErr) {
            console.warn('Similarity comparison skipped for peer submission:', simErr);
          }
        }
      } catch (err) {
        console.error('Failed background snapshot/similarity for submission:', submission.id, err);
      }
    })();

    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Failed to create GitHub submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const syllabusItemId = req.nextUrl.searchParams.get('syllabusItemId');
  const user = session.user as { role: string };
  const isInstructorOrAdmin = user.role === 'PROFESSOR' || user.role === 'ADMIN' || user.role === 'TEACHER';

  const whereClause: Record<string, unknown> = {};
  if (syllabusItemId) {
    whereClause.syllabusItemId = syllabusItemId;
  }

  // If not instructor or admin, only see own submissions
  if (!isInstructorOrAdmin) {
    whereClause.userId = session.user.id;
  }

  const submissions = await db.githubSubmission.findMany({
    where: whereClause,
    include: {
      user: {
        select: { id: true, name: true, studentNumber: true, avatarUrl: true },
      },
      repoLink: true,
      similaritiesA: {
        where: { flagged: true },
      },
      similaritiesB: {
        where: { flagged: true },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  return NextResponse.json(submissions);
}
