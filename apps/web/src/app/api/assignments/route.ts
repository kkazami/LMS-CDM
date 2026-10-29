import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { visibleSyllabusForms } from '@/lib/forms/visibility';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { requireCourseAccess } from '@/lib/course-access';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET assignments/route.ts");
  if (ceilingDenial) return ceilingDenial;

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
    if (!Number.isSafeInteger(skip) || !Number.isSafeInteger(limit) || (courseId?.length ?? 0) > 200) throw new AccessError(400, 'Invalid query.');
    if (!['STUDENT', 'INSTRUCTOR', 'ADMIN'].includes(canonicalRole(session.user.role))) throw new AccessError(403, 'Forbidden.');

    if (!instituteCode && !courseId) {
      return NextResponse.json({ message: 'Institute code or courseId is required.' }, { status: 400 });
    }

    // If courseId provided, get assignments for that specific course
    if (courseId) {
      const course = await requireCourseAccess(session.user, courseId);
      if (instituteCode && course.institute.code !== instituteCode.toLowerCase()) throw new AccessError(404, 'Course not found.');
      const whereCondition = { courseId, ...(canonicalRole(session.user.role) === 'STUDENT' ? await visibleSyllabusForms(undefined, session.user.id) : {}) };
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
            'Cache-Control': 'private, no-store',
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
    if (institute.id !== session.user.instituteId) throw new AccessError(403, 'Forbidden institute.');
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

    const whereCondition = { courseId: { in: courseIds }, ...(canonicalRole(session.user.role) === 'STUDENT' ? await visibleSyllabusForms(undefined, session.user.id) : {}) };
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
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    return accountErrorResponse(error);
  }
}
