import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instituteCode = searchParams.get('institute');
    const courseId = searchParams.get('courseId');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10), 1), 50);
    const skip = (page - 1) * limit;

    if (!instituteCode && !courseId) {
      return NextResponse.json({ message: 'Institute code or courseId is required.' }, { status: 400 });
    }

    // If courseId provided, get assignments for that specific course
    if (courseId) {
      const whereCondition = { courseId };
      const [items, totalCount] = await Promise.all([
        db.syllabusItem.findMany({
          where: whereCondition,
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            maxPoints: true,
            dueDate: true,
            courseId: true,
            createdAt: true,
            course: { select: { title: true } },
          },
          orderBy: { dueDate: 'asc' },
          skip,
          take: limit,
        }),
        db.syllabusItem.count({ where: whereCondition }),
      ]);

      return NextResponse.json(
        {
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
          pagination: {
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
            hasMore: skip + items.length < totalCount,
          },
        },
        {
          headers: {
            'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
          },
        }
      );
    }

    // Otherwise get all assignments for user's enrolled courses in this institute
    const institute = await db.institute.findUnique({
      where: { code: instituteCode! },
      select: { id: true },
    });
    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    const role = (session.user.role || 'STUDENT').toUpperCase();
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

    const whereCondition = { courseId: { in: courseIds } };
    const [items, totalCount] = await Promise.all([
      db.syllabusItem.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          maxPoints: true,
          dueDate: true,
          courseId: true,
          createdAt: true,
          course: { select: { title: true } },
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      db.syllabusItem.count({ where: whereCondition }),
    ]);

    return NextResponse.json(
      {
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
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + items.length < totalCount,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('ASSIGNMENTS_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
