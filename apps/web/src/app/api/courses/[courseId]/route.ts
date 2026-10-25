import { requireCourseAccess } from '@/lib/course-access';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { visibleSyllabusForms } from '@/lib/forms/availability';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    await requireCourseAccess(session.user, courseId);

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        code: true,
        courseCode: true,
        title: true,
        description: true,
        room: true,
        section: true,
        subject: true,
        coverImage: true,
        instructor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        institute: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        syllabusItems: {
          where: session.user.role.toUpperCase() === 'STUDENT' ? visibleSyllabusForms(undefined, session.user.id) : {},
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            maxPoints: true,
            dueDate: true,
            orderIndex: true,
          },
          orderBy: { orderIndex: 'asc' },
          take: 20,
        },
        announcements: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    return NextResponse.json(
      {
        course: {
          ...course,
          courseCode: course.courseCode || course.code,
          instructorName: course.instructor?.name || 'Instructor',
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error('COURSE_DETAIL_API_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course details.' }, { status: 500 });
  }
}
