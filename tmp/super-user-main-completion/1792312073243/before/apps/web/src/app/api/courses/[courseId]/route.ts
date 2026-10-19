import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;

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
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('COURSE_DETAIL_API_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course details.' }, { status: 500 });
  }
}
