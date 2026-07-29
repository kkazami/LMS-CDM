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

    if (!instituteCode) {
      return NextResponse.json({ message: 'Institute code is required.' }, { status: 400 });
    }

    const institute = await db.institute.findUnique({
      where: { code: instituteCode },
    });

    if (!institute) {
      return NextResponse.json({ message: 'Institute not found.' }, { status: 404 });
    }

    const announcements = await db.announcement.findMany({
      where: {
        course: { instituteId: institute.id },
      },
      include: {
        author: { select: { name: true } },
        course: { select: { title: true, id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.content.slice(0, 40) || 'Announcement',
        content: a.content,
        authorName: a.author?.name || 'Unknown',
        courseName: a.course?.title || null,
        courseId: a.course?.id || null,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('ANNOUNCEMENTS_API_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
