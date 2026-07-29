import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instituteCode = searchParams.get('institute');
    const courseId = searchParams.get('courseId');

    if (!instituteCode && !courseId) {
      return NextResponse.json({ message: 'Institute code or courseId is required.' }, { status: 400 });
    }

    // If courseId provided, get assignments for that course
    if (courseId) {
      const items = await db.syllabusItem.findMany({
        where: { courseId },
        include: {
          course: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        assignments: items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          type: item.type,
          maxPoints: item.maxPoints,
          dueDate: item.dueDate?.toISOString() || null,
          courseId: item.courseId,
          courseName: item.course?.title || null,
          createdAt: item.createdAt.toISOString(),
        })),
      });
    }

    // Otherwise get all assignments for user's enrolled courses in this institute
    const institute = await db.institute.findUnique({ where: { code: instituteCode! } });
    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    const role = session.user.role.toUpperCase();
    let courseIds: string[] = [];

    if (role === 'STUDENT') {
      const enrollments = await db.enrollment.findMany({
        where: { studentId: session.user.id, status: 'APPROVED', course: { instituteId: institute.id } },
        select: { courseId: true },
      });
      courseIds = enrollments.map((e) => e.courseId);
    } else {
      const courses = await db.course.findMany({
        where: { instructorId: session.user.id, instituteId: institute.id },
        select: { id: true },
      });
      courseIds = courses.map((c) => c.id);
    }

    const items = await db.syllabusItem.findMany({
      where: { courseId: { in: courseIds } },
      include: {
        course: { select: { title: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 50,
    });

    return NextResponse.json({
      assignments: items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        maxPoints: item.maxPoints,
        dueDate: item.dueDate?.toISOString() || null,
        courseId: item.courseId,
        courseName: item.course?.title || null,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('ASSIGNMENTS_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
