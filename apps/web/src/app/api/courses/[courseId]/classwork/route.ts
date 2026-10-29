import { academicProvenance } from '@/lib/labs/readiness';
import { labsAvailable, currentLabAttempt } from '@/lib/labs/readiness';
import { visibleSyllabusForms } from '@/lib/forms/visibility';
import { z } from 'zod';
import { requireCourseAccess } from '@/lib/course-access';
import { attachmentLocation } from '@/lib/academic-records';
import { accountErrorResponse, AccessError, assertMutationOrigin } from '@/lib/super-user-v1/actor';
const classworkInput = z.object({
  title: z.string().trim().min(1).max(300), description: z.string().max(50000).default(''),
  type: z.string().transform(value => value.toUpperCase()).pipe(z.enum(['ASSIGNMENT','QUIZ','MATERIAL','EXAM','PROJECT','ACTIVITY'])).default('ASSIGNMENT'),
  maxPoints: z.number().finite().min(0).max(100000).nullable().optional(),
  dueDate: z.string().datetime({ offset: true }).nullable().optional(),
  attachmentUrl: attachmentLocation.optional(), attachmentName: z.string().max(255).optional(),
  attachments: z.array(z.object({ url: attachmentLocation, fileName: z.string().max(255).optional(), type: z.enum(['FILE','LINK']).optional(), fileSize: z.number().int().min(0).max(25 * 1024 * 1024).nullable().optional() }).strict()).max(20).optional(),
}).strict();

import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { requireOwnedUpload } from '@/lib/private-upload';
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
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/classwork/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    await requireCourseAccess(session.user, courseId);

    const [syllabusItems, studentSubmissions] = await Promise.all([
      db.syllabusItem.findMany({
        where: { courseId, ...(session.user.role.toUpperCase() === 'STUDENT' ? await visibleSyllabusForms(undefined, session.user.id) : {}) },
        include: {
          labAssignment: await labsAvailable() ? ({ select: { id: true, attempts: { where: { studentId: session.user.id }, select: { status: true, revisionDueAt: true } } } } as const) : false as const,
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
        taskFormat: item.labAssignment ? 'GUIDED_LAB' : null,
        labAssignmentId: item.labAssignment?.id ?? null,
        labStatus: currentLabAttempt(item.labAssignment)?.status ?? null,
        revisionDueAt: currentLabAttempt(item.labAssignment)?.revisionDueAt?.toISOString() ?? null,
        labUrl: item.labAssignment ? `/ics/courses/${courseId}/labs/${item.labAssignment.id}` : null,
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
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    return accountErrorResponse(error);
  }
}

/**
 * POST /api/courses/[courseId]/classwork
 * Creates a new syllabus item (Assignment, Quiz, or Material) with optional attachments.
 */
export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/classwork/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    assertMutationOrigin(request);
    const { courseId } = await context.params;
    const course = await requireCourseAccess(session.user, courseId, true);
    const parsed = classworkInput.safeParse(await request.json());
    if (!parsed.success) throw new AccessError(400, 'Invalid classwork request.');
    const body = parsed.data;
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
      where: { courseId, ...(session.user.role.toUpperCase() === 'STUDENT' ? await visibleSyllabusForms(undefined, session.user.id) : {}) },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const parsedMaxPoints =
      maxPoints !== undefined && maxPoints !== null && !isNaN(Number(maxPoints))
        ? Math.max(0, parseInt(String(maxPoints), 10))
        : null;

    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    const syllabusItem = await db.$transaction(async tx => {
      for (const file of [...(attachments ?? []), ...(attachmentUrl ? [{ url: attachmentUrl }] : [])]) await requireOwnedUpload(tx, session.user, file.url);
      const syllabusItem = await tx.syllabusItem.create({
      data: {
        courseId,
        type: type.toUpperCase(),
        ...await academicProvenance('UNTOUCHED', tx),
        title: title.trim(),
        description: description ? description.trim() : '',
        maxPoints: parsedMaxPoints,
        dueDate: parsedDueDate,
        orderIndex: (lastItem?.orderIndex ?? -1) + 1,
      },
    });

    // Handle attachments
    if (attachmentUrl) {
      await tx.attachment.create({
        data: {
          syllabusItemId: syllabusItem.id,
          type: 'FILE',
          url: attachmentUrl,
          fileName: attachmentName || 'Attachment',
        },
      });
    }

    if (Array.isArray(attachments) && attachments.length > 0) {
      await tx.attachment.createMany({
        data: attachments.map((att) => ({
          syllabusItemId: syllabusItem.id,
          type: att.type || 'FILE',
          url: att.url,
          fileName: att.fileName || 'Attachment',
          fileSize: att.fileSize || null,
        })),
      });
    }

      return syllabusItem;
    });

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
      console.warn('NOTIFY_CLASSWORK_UNAVAILABLE');
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
    return accountErrorResponse(error);
  }
}
