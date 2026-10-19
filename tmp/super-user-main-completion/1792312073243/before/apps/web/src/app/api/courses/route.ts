import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

/**
 * GET /api/courses?institute=ics&page=1&limit=15
 * Fetches lightweight course list for the authenticated user/institute.
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instituteCode = searchParams.get('institute') || 'ics';
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 50);
    const skip = (page - 1) * limit;

    const institute = await db.institute.findUnique({
      where: { code: instituteCode.toLowerCase() },
      select: { id: true, name: true, code: true },
    });

    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    const role = (session.user.role || 'STUDENT').toUpperCase();
    let courses: any[] = [];
    let totalCount = 0;

    if (role === 'STUDENT') {
      const whereCondition = {
        studentId: session.user.id,
        status: 'APPROVED',
        course: {
          instituteId: institute.id,
          isArchived: false,
        },
      };

      const [enrollments, count] = await Promise.all([
        db.enrollment.findMany({
          where: whereCondition,
          select: {
            course: {
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
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: { displayOrderIndex: 'asc' },
          skip,
          take: limit,
        }),
        db.enrollment.count({ where: whereCondition }),
      ]);

      totalCount = count;
      courses = enrollments.map((e) => ({
        id: e.course.id,
        code: e.course.code,
        courseCode: e.course.courseCode || e.course.code,
        title: e.course.title,
        description: e.course.description,
        room: e.course.room,
        section: e.course.section,
        subject: e.course.subject,
        coverImage: e.course.coverImage,
        instructorName: e.course.instructor?.name || 'Instructor',
      }));
    } else if (role === 'PROFESSOR' || role === 'TEACHER') {
      const whereCondition = {
        instructorId: session.user.id,
        instituteId: institute.id,
        isArchived: false,
      };

      const [taughtCourses, count] = await Promise.all([
        db.course.findMany({
          where: whereCondition,
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
            _count: {
              select: { enrollments: true },
            },
          },
          orderBy: { code: 'asc' },
          skip,
          take: limit,
        }),
        db.course.count({ where: whereCondition }),
      ]);

      totalCount = count;
      courses = taughtCourses.map((c) => ({
        id: c.id,
        code: c.code,
        courseCode: c.courseCode || c.code,
        title: c.title,
        description: c.description,
        room: c.room,
        section: c.section,
        subject: c.subject,
        coverImage: c.coverImage,
        instructorName: session.user.name,
        studentCount: c._count?.enrollments || 0,
      }));
    } else {
      // Admin view - all active courses for institute
      const whereCondition = {
        instituteId: institute.id,
        isArchived: false,
      };

      const [allCourses, count] = await Promise.all([
        db.course.findMany({
          where: whereCondition,
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
              select: { name: true },
            },
          },
          orderBy: { code: 'asc' },
          skip,
          take: limit,
        }),
        db.course.count({ where: whereCondition }),
      ]);

      totalCount = count;
      courses = allCourses.map((c) => ({
        id: c.id,
        code: c.code,
        courseCode: c.courseCode || c.code,
        title: c.title,
        description: c.description,
        room: c.room,
        section: c.section,
        subject: c.subject,
        coverImage: c.coverImage,
        instructorName: c.instructor?.name || 'Unassigned',
      }));
    }

    return NextResponse.json(
      {
        courses,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + courses.length < totalCount,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('COURSES_API_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch courses.' }, { status: 500 });
  }
}
