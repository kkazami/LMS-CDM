import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/gradebook
 * Fetches student rosters, assignments, submission states, and grade matrix for instructor review.
 */
export async function GET(request: Request, context: RouteContext) {
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
      select: { id: true, instructorId: true, title: true, code: true },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    if (role !== 'ADMIN' && course.instructorId !== session.user.id) {
      return NextResponse.json({ message: 'You are not the instructor for this course.' }, { status: 403 });
    }

    const [enrollments, syllabusItems, submissions, gradingPolicy] = await Promise.all([
      db.enrollment.findMany({
        where: { courseId, status: 'APPROVED' },
        include: {
          student: {
            select: { id: true, name: true, email: true, studentNumber: true, avatarUrl: true },
          },
        },
        orderBy: { student: { name: 'asc' } },
      }),
      db.syllabusItem.findMany({
        where: {
          courseId,
          type: { not: 'MATERIAL' },
          maxPoints: { not: null },
        },
        select: {
          id: true,
          title: true,
          maxPoints: true,
          type: true,
          dueDate: true,
          orderIndex: true,
        },
        orderBy: { orderIndex: 'asc' },
      }),
      db.studentSubmission.findMany({
        where: { syllabusItem: { courseId } },
        select: {
          id: true,
          syllabusItemId: true,
          studentId: true,
          grade: true,
          status: true,
          isReturned: true,
          submittedAt: true,
          attachments: {
            select: { id: true, type: true, url: true, fileName: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      db.gradingPolicy.findUnique({
        where: { courseId },
        include: { weights: true },
      }),
    ]);

    const students = enrollments.map((e) => ({
      id: e.student.id,
      name: e.student.name,
      email: e.student.email,
      studentNumber: e.student.studentNumber,
      avatarUrl: e.student.avatarUrl,
    }));

    const assignments = syllabusItems.map((item) => ({
      id: item.id,
      title: item.title,
      maxPoints: item.maxPoints,
      type: item.type,
      dueDate: item.dueDate?.toISOString() || null,
    }));

    // Build nested grade matrix: grades[studentId][assignmentId]
    const grades: Record<
      string,
      Record<
        string,
        {
          submissionId: string | null;
          grade: number | null;
          status: string | null;
          isReturned: boolean;
          submittedAt: string | null;
          attachments: Array<{ id: string; type: string; url: string; fileName: string }>;
        }
      >
    > = {};

    for (const student of students) {
      grades[student.id] = {};
      for (const assignment of assignments) {
        grades[student.id][assignment.id] = {
          submissionId: null,
          grade: null,
          status: null,
          isReturned: false,
          submittedAt: null,
          attachments: [],
        };
      }
    }

    for (const sub of submissions) {
      if (grades[sub.studentId]?.[sub.syllabusItemId] !== undefined) {
        grades[sub.studentId][sub.syllabusItemId] = {
          submissionId: sub.id,
          grade: sub.grade,
          status: sub.status,
          isReturned: sub.isReturned,
          submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
          attachments: sub.attachments,
        };
      }
    }

    return NextResponse.json({
      course: { id: course.id, title: course.title, code: course.code },
      students,
      assignments,
      grades,
      gradingPolicy: gradingPolicy
        ? {
            weights: gradingPolicy.weights.map((w) => ({
              category: w.category,
              weightPercentage: w.weightPercentage,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error('GRADEBOOK_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch gradebook data.' }, { status: 500 });
  }
}
