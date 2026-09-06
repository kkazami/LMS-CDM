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

    const whereCondition = {
      course: { instituteId: institute.id },
    };

    const [announcements, totalCount] = await Promise.all([
      db.announcement.findMany({
        where: whereCondition,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true } },
          course: { select: { title: true, id: true } },
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
          courseName: a.course?.title || null,
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
