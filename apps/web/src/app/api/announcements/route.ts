import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET announcements/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instituteCode = searchParams.get('institute');
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '15', 10), 1), 50);
    const skip = (page - 1) * limit;

    if (!instituteCode) {
      return NextResponse.json({ message: 'Institute code is required.' }, { status: 400 });
    }

    const institute = await db.institute.findUnique({
      where: { code: instituteCode },
      select: { id: true },
    });

    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    // Check role-based scoping: students only see announcements for their approved courses
    const userRole = (session.user.role || '').toUpperCase();
    const courseIdFilter = searchParams.get('courseId');

    let whereCondition: any;

    if (userRole === 'STUDENT') {
      const enrollments = await db.enrollment.findMany({
        where: {
          studentId: session.user.id,
          status: 'APPROVED',
          course: {
            instituteId: institute.id,
            isArchived: false,
          },
        },
        select: { courseId: true },
      });

      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      if (enrolledCourseIds.length === 0) {
        return NextResponse.json({
          announcements: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 0,
            hasMore: false,
          },
        });
      }

      const targetCourseIds = courseIdFilter
        ? (enrolledCourseIds.includes(courseIdFilter) ? [courseIdFilter] : [])
        : enrolledCourseIds;

      if (targetCourseIds.length === 0) {
        return NextResponse.json({
          announcements: [],
          pagination: {
            page,
            limit,
            totalCount: 0,
            totalPages: 0,
            hasMore: false,
          },
        });
      }

      whereCondition = {
        courseId: { in: targetCourseIds },
        course: { instituteId: institute.id, isArchived: false },
      };
    } else {
      whereCondition = {
        course: { instituteId: institute.id, isArchived: false },
        ...(courseIdFilter ? { courseId: courseIdFilter } : {}),
      };
    }

    const [announcements, totalCount] = await Promise.all([
      db.announcement.findMany({
        where: whereCondition,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true, avatarUrl: true } },
          course: { select: { title: true, id: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.announcement.count({ where: whereCondition }),
    ]);

    return NextResponse.json(
      {
        announcements: announcements.map((a) => ({
          id: a.id,
          title: a.content.slice(0, 45) || 'Announcement',
          content: a.content,
          authorName: a.author?.name || 'Instructor',
          authorAvatarUrl: a.author?.avatarUrl || null,
          courseName: a.course?.title || null,
          courseCode: a.course?.code || null,
          courseId: a.course?.id || null,
          createdAt: a.createdAt.toISOString(),
        })),
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + announcements.length < totalCount,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('ANNOUNCEMENTS_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
