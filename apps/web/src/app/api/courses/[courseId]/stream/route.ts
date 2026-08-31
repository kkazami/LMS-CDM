import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/stream
 * Fetches stream announcements and broadcast alerts for the course.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;

    const [announcements, broadcasts] = await Promise.all([
      db.announcement.findMany({
        where: { courseId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      db.notificationBroadcast.findMany({
        where: { courseId },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const formattedAnnouncements = announcements.map((a) => ({
      id: a.id,
      content: a.content,
      createdAt: a.createdAt.toISOString(),
      author: {
        id: a.author.id,
        name: a.author.name,
        email: a.author.email,
        avatarUrl: a.author.avatarUrl,
        role: a.author.role,
      },
    }));

    const formattedBroadcasts = broadcasts.map((b) => ({
      id: b.id,
      message: b.message,
      category: b.category,
      createdAt: b.createdAt.toISOString(),
      senderName: b.sender.name,
      senderAvatar: b.sender.avatarUrl,
    }));

    return NextResponse.json(
      {
        announcements: formattedAnnouncements,
        broadcasts: formattedBroadcasts,
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('COURSE_STREAM_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch course stream.' }, { status: 500 });
  }
}

/**
 * POST /api/courses/[courseId]/stream
 * Creates a new class announcement or discussion item.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { courseId } = await context.params;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ message: 'Announcement content cannot be empty.' }, { status: 400 });
    }

    const announcement = await db.announcement.create({
      data: {
        courseId,
        authorId: session.user.id,
        content: content.trim(),
      },
      include: {
        author: {
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

    return NextResponse.json({
      success: true,
      announcement: {
        id: announcement.id,
        content: announcement.content,
        createdAt: announcement.createdAt.toISOString(),
        author: announcement.author,
      },
    });
  } catch (error) {
    console.error('COURSE_STREAM_POST_ERROR', error);
    return NextResponse.json({ message: 'Failed to post announcement.' }, { status: 500 });
  }
}
