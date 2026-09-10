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
/**
 * GET /api/courses/[courseId]/submissions?syllabusItemId=...
 * Fetches submission(s) for a syllabus item.
 * Students get their own submission; Instructors get all student submissions.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    const { searchParams } = new URL(request.url);
    const syllabusItemId = searchParams.get('syllabusItemId');

    if (!syllabusItemId) {
      return NextResponse.json({ message: 'syllabusItemId query param is required.' }, { status: 400 });
    }

    const role = (session.user.role as string).toUpperCase();
    const isInstructor = role === 'PROFESSOR' || role === 'TEACHER' || role === 'ADMIN';

    if (isInstructor) {
      const submissions = await db.studentSubmission.findMany({
        where: { syllabusItemId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              studentNumber: true,
              avatarUrl: true,
            },
          },
          attachments: {
            select: { id: true, type: true, url: true, fileName: true },
          },
        },
        orderBy: { submittedAt: 'desc' },
      });

      return NextResponse.json({ submissions });
    }

    // Student view: their own submission
    const submission = await db.studentSubmission.findUnique({
      where: {
        syllabusItemId_studentId: {
          syllabusItemId,
          studentId: session.user.id,
        },
      },
      include: {
        attachments: {
          select: { id: true, type: true, url: true, fileName: true },
        },
      },
    });

    return NextResponse.json({ submission: submission || null });
  } catch (error) {
    console.error('COURSE_SUBMISSIONS_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch submission.' }, { status: 500 });
  }
}

/**
 * POST /api/courses/[courseId]/submissions
 * Submits or saves a draft submission for a syllabus item.
 * Supports multiple file attachments and unsubmit (status: 'DRAFT').
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    const body = await request.json();
    const { syllabusItemId, status = 'SUBMITTED', attachmentUrl, fileName, attachments } = body;

    if (!syllabusItemId) {
      return NextResponse.json({ message: 'syllabusItemId is required.' }, { status: 400 });
    }

    const syllabusItem = await db.syllabusItem.findFirst({
      where: { id: syllabusItemId, courseId },
    });

    if (!syllabusItem) {
      return NextResponse.json({ message: 'Syllabus item not found for this course.' }, { status: 404 });
    }

    // Check existing submission for unsubmit restrictions
    const existing = await db.studentSubmission.findUnique({
      where: {
        syllabusItemId_studentId: {
          syllabusItemId,
          studentId: session.user.id,
        },
      },
    });

    if (existing && status === 'DRAFT') {
      if (existing.isReturned || existing.grade !== null) {
        return NextResponse.json(
          { message: 'This assignment has already been graded/returned and cannot be unsubmitted.' },
          { status: 400 }
        );
      }
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
        submittedAt: status === 'SUBMITTED' ? new Date() : existing?.submittedAt ?? null,
      },
      create: {
        syllabusItemId,
        studentId: session.user.id,
        status,
        submittedAt: status === 'SUBMITTED' ? new Date() : null,
      },
    });

    // Handle single attachment (legacy/backward compatibility)
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

    // Handle multiple attachments
    if (Array.isArray(attachments) && attachments.length > 0) {
      await db.submissionAttachment.createMany({
        data: attachments.map((att: { url: string; fileName?: string; type?: string }) => ({
          submissionId: submission.id,
          type: att.type || 'FILE',
          url: att.url,
          fileName: att.fileName || 'Attachment',
        })),
      });
    }

    const updated = await db.studentSubmission.findUnique({
      where: { id: submission.id },
      include: {
        attachments: {
          select: { id: true, type: true, url: true, fileName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        id: updated!.id,
        status: updated!.status,
        grade: updated!.grade,
        isReturned: updated!.isReturned,
        submittedAt: updated!.submittedAt?.toISOString() || null,
        attachments: updated!.attachments,
      },
    });
  } catch (error) {
    console.error('COURSE_SUBMISSIONS_POST_ERROR', error);
    return NextResponse.json({ message: 'Failed to submit assignment.' }, { status: 500 });
  }
}
