import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * POST /api/courses/[courseId]/submissions
 * Submits or saves a draft submission for a syllabus item.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    const body = await request.json();
    const { syllabusItemId, status = 'SUBMITTED', attachmentUrl, fileName } = body;

    if (!syllabusItemId) {
      return NextResponse.json({ message: 'syllabusItemId is required.' }, { status: 400 });
    }

    const syllabusItem = await db.syllabusItem.findFirst({
      where: { id: syllabusItemId, courseId },
    });

    if (!syllabusItem) {
      return NextResponse.json({ message: 'Syllabus item not found for this course.' }, { status: 404 });
    }

    const submission = await db.studentSubmission.upsert({
      where: {
        syllabusItemId_studentId: {
          syllabusItemId,
          studentId: session.user.id,
        },
      },
      update: {
        status,
        submittedAt: status === 'SUBMITTED' ? new Date() : null,
      },
      create: {
        syllabusItemId,
        studentId: session.user.id,
        status,
        submittedAt: status === 'SUBMITTED' ? new Date() : null,
      },
    });

    if (attachmentUrl) {
      await db.submissionAttachment.create({
        data: {
          submissionId: submission.id,
          type: 'LINK',
          url: attachmentUrl,
          fileName: fileName || 'Submission Link',
        },
      });
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('COURSE_SUBMISSIONS_POST_ERROR', error);
    return NextResponse.json({ message: 'Failed to submit assignment.' }, { status: 500 });
  }
}
