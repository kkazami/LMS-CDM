import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/enrollments?status=PENDING
 * Returns enrollment records for a course (Instructors/Admins only).
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
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status')?.toUpperCase();

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    if (role !== 'ADMIN' && course.instructorId !== session.user.id) {
      return NextResponse.json({ message: 'You are not the instructor for this course.' }, { status: 403 });
    }

    const whereCondition: Record<string, unknown> = { courseId };
    if (statusFilter) {
      whereCondition.status = statusFilter;
    }

    const enrollments = await db.enrollment.findMany({
      where: whereCondition,
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
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      enrollments: enrollments.map((e) => ({
        id: e.id,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
        student: e.student,
      })),
      totalCount: enrollments.length,
    });
  } catch (error) {
    console.error('COURSE_ENROLLMENTS_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch enrollments.' }, { status: 500 });
  }
}

/**
 * PATCH /api/courses/[courseId]/enrollments
 * Approves or rejects a student's enrollment request.
 * Body: { enrollmentId: string, action: 'APPROVE' | 'REJECT' }
 */
export async function PATCH(request: Request, context: RouteContext) {
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

    const body = await request.json();
    const { enrollmentId, action } = body;

    if (!enrollmentId || !action) {
      return NextResponse.json({ message: 'enrollmentId and action are required.' }, { status: 400 });
    }

    const normalizedAction = action.toUpperCase();
    if (normalizedAction !== 'APPROVE' && normalizedAction !== 'REJECT') {
      return NextResponse.json({ message: "Action must be 'APPROVE' or 'REJECT'." }, { status: 400 });
    }

    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment || enrollment.courseId !== courseId) {
      return NextResponse.json({ message: 'Enrollment record not found in this course.' }, { status: 404 });
    }

    const updated = await db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: normalizedAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      },
    });

    // Notify student if approved
    if (normalizedAction === 'APPROVE') {
      await createNotification({
        userId: enrollment.studentId,
        type: 'CLASSWORK',
        title: `Enrolled in ${course.code}`,
        message: `Your enrollment request for ${course.title} has been approved.`,
        link: `/${courseId}/classwork`,
      });
    }

    return NextResponse.json({
      success: true,
      enrollment: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('COURSE_ENROLLMENTS_PATCH_ERROR', error);
    return NextResponse.json({ message: 'Failed to update enrollment.' }, { status: 500 });
  }
}
