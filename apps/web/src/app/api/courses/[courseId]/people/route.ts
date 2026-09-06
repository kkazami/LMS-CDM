import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/people
 * Fetches course instructor and enrolled student list.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;

    const course = await db.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        status: 'APPROVED',
      },
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
      orderBy: { student: { name: 'asc' } },
    });

    const students = enrollments.map((e) => ({
      enrollmentId: e.id,
      id: e.student.id,
      name: e.student.name,
      email: e.student.email,
      studentNumber: e.student.studentNumber || 'N/A',
      avatarUrl: e.student.avatarUrl,
    }));

    return NextResponse.json(
      {
        instructor: course.instructor || null,
        students,
        totalEnrolled: students.length,
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('COURSE_PEOPLE_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course members.' }, { status: 500 });
  }
}
