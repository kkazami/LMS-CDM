import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/classwork
 * Fetches structured syllabus items, attachments, and student's personal submission state.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;

    const [syllabusItems, studentSubmissions] = await Promise.all([
      db.syllabusItem.findMany({
        where: { courseId },
        include: {
          attachments: {
            select: {
              id: true,
              type: true,
              url: true,
              fileName: true,
              fileSize: true,
            },
          },
        },
        orderBy: { orderIndex: 'asc' },
      }),
      db.studentSubmission.findMany({
        where: {
          studentId: session.user.id,
          syllabusItem: { courseId },
        },
        include: {
          attachments: {
            select: {
              id: true,
              type: true,
              url: true,
              fileName: true,
            },
          },
        },
      }),
    ]);

    const submissionMap = new Map<string, any>();
    studentSubmissions.forEach((sub) => {
      submissionMap.set(sub.syllabusItemId, {
        id: sub.id,
        status: sub.status,
        grade: sub.grade,
        isReturned: sub.isReturned,
        submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
        attachments: sub.attachments,
      });
    });

    const formattedItems = syllabusItems.map((item) => {
      const submission = submissionMap.get(item.id) || null;
      return {
        id: item.id,
        type: item.type, // "ASSIGNMENT" | "QUIZ" | "MATERIAL" | "EXAM"
        title: item.title,
        description: item.description,
        maxPoints: item.maxPoints,
        dueDate: item.dueDate ? item.dueDate.toISOString() : null,
        orderIndex: item.orderIndex,
        attachments: item.attachments,
        submission,
      };
    });

    // Categorize by section/type
    const assignments = formattedItems.filter((i) => i.type === 'ASSIGNMENT');
    const quizzes = formattedItems.filter((i) => i.type === 'QUIZ');
    const materials = formattedItems.filter((i) => i.type === 'MATERIAL');
    const others = formattedItems.filter((i) => !['ASSIGNMENT', 'QUIZ', 'MATERIAL'].includes(i.type));

    return NextResponse.json(
      {
        items: formattedItems,
        categories: [
          { name: 'Assignments', count: assignments.length, items: assignments },
          { name: 'Quizzes & Assessments', count: quizzes.length, items: quizzes },
          { name: 'Learning Materials', count: materials.length, items: materials },
          ...(others.length > 0 ? [{ name: 'Other Modules', count: others.length, items: others }] : []),
        ],
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('COURSE_CLASSWORK_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course classwork.' }, { status: 500 });
  }
}

/**
 * POST /api/courses/[courseId]/classwork
 * Creates a new syllabus item (Assignment, Quiz, or Material) with optional attachments.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== 'PROFESSOR' && role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Instructors only.' }, { status: 403 });
    }

    const { courseId } = await context.params;
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    if (role !== 'ADMIN' && course.instructorId !== session.user.id) {
      return NextResponse.json({ message: 'You are not the instructor for this course.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description = '',
      type = 'ASSIGNMENT',
      maxPoints,
      dueDate,
      attachmentUrl,
      attachmentName,
      attachments,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ message: 'Title is required.' }, { status: 400 });
    }

    const lastItem = await db.syllabusItem.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const parsedMaxPoints =
      maxPoints !== undefined && maxPoints !== null && !isNaN(Number(maxPoints))
        ? Math.max(0, parseInt(String(maxPoints), 10))
        : null;

    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    const syllabusItem = await db.syllabusItem.create({
      data: {
        courseId,
        type: type.toUpperCase(),
        title: title.trim(),
        description: description ? description.trim() : '',
        maxPoints: parsedMaxPoints,
        dueDate: parsedDueDate,
        orderIndex: (lastItem?.orderIndex ?? -1) + 1,
      },
    });

    // Handle attachments
    if (attachmentUrl) {
      await db.attachment.create({
        data: {
          syllabusItemId: syllabusItem.id,
          type: 'FILE',
          url: attachmentUrl,
          fileName: attachmentName || 'Attachment',
        },
      });
    }

    if (Array.isArray(attachments) && attachments.length > 0) {
      await db.attachment.createMany({
        data: attachments.map((att: { url: string; fileName?: string; type?: string; fileSize?: number }) => ({
          syllabusItemId: syllabusItem.id,
          type: att.type || 'FILE',
          url: att.url,
          fileName: att.fileName || 'Attachment',
          fileSize: att.fileSize || null,
        })),
      });
    }

    // Notify enrolled students
    try {
      const { createNotificationsForCourseStudents } = await import('@/lib/notifications');
      const itemLabel = syllabusItem.type === 'QUIZ' ? 'quiz' : syllabusItem.type === 'MATERIAL' ? 'material' : 'assignment';
      await createNotificationsForCourseStudents(courseId, {
        type: 'CLASSWORK',
        title: `New ${itemLabel}: ${syllabusItem.title}`,
        message: `Your instructor posted a new ${itemLabel} in ${course.title}.`,
        link: `/${courseId}/classwork`,
      });
    } catch (notifErr) {
      console.error('NOTIFY_CLASSWORK_ERROR', notifErr);
    }

    const createdWithAttachments = await db.syllabusItem.findUnique({
      where: { id: syllabusItem.id },
      include: { attachments: true },
    });

    return NextResponse.json({
      success: true,
      item: {
        ...createdWithAttachments,
        dueDate: createdWithAttachments?.dueDate?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error('COURSE_CLASSWORK_POST_ERROR', error);
    return NextResponse.json({ message: 'Failed to create classwork.' }, { status: 500 });
  }
}
