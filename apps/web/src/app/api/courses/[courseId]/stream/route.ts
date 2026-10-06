import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { createNotificationsForCourseStudents } from '@/lib/notifications';

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
 * Creates a new class announcement or discussion item and dispatches notifications.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== 'PROFESSOR' && role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Only instructors can post announcements.' }, { status: 403 });
    }

    const { courseId } = await context.params;
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        instructorId: true,
        code: true,
        title: true,
        institute: { select: { code: true } },
      },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    if (role !== 'ADMIN' && course.instructorId !== session.user.id) {
      return NextResponse.json({ message: 'You are not authorized for this course.' }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ message: 'Announcement content cannot be empty.' }, { status: 400 });
    }

    const trimmedContent = content.trim();

    const announcement = await db.announcement.create({
      data: {
        courseId,
        authorId: session.user.id,
        content: trimmedContent,
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

    // Notify all approved students in this course
    const previewText = trimmedContent.length > 60 ? trimmedContent.slice(0, 57) + '…' : trimmedContent;
    const instituteCode = course.institute?.code || 'ics';
    await createNotificationsForCourseStudents(courseId, {
      type: 'ANNOUNCEMENT',
      title: 'New Announcement',
      message: `New announcement in ${course.code}: ${previewText}`,
      link: `/${instituteCode}/announcements`,
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

/**
 * PATCH /api/courses/[courseId]/stream
 * Edits an existing announcement.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== 'PROFESSOR' && role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Only instructors can edit announcements.' }, { status: 403 });
    }

    const { courseId } = await context.params;
    const body = await request.json();
    const { announcementId, content } = body;

    if (!announcementId || typeof announcementId !== 'string') {
      return NextResponse.json({ message: 'Announcement ID is required.' }, { status: 400 });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ message: 'Announcement content cannot be empty.' }, { status: 400 });
    }

    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, authorId: true, courseId: true },
    });

    if (!announcement || announcement.courseId !== courseId) {
      return NextResponse.json({ message: 'Announcement not found.' }, { status: 404 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    const isAuthor = announcement.authorId === session.user.id;
    const isInstructor = course?.instructorId === session.user.id;
    const isAdmin = role === 'ADMIN';

    if (!isAuthor && !isInstructor && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized to edit this announcement.' }, { status: 403 });
    }

    const updated = await db.announcement.update({
      where: { id: announcementId },
      data: { content: content.trim() },
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
        id: updated.id,
        content: updated.content,
        createdAt: updated.createdAt.toISOString(),
        author: updated.author,
      },
    });
  } catch (error) {
    console.error('COURSE_STREAM_PATCH_ERROR', error);
    return NextResponse.json({ message: 'Failed to update announcement.' }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[courseId]/stream
 * Deletes an existing announcement.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== 'PROFESSOR' && role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Only instructors can delete announcements.' }, { status: 403 });
    }

    const { courseId } = await context.params;

    // Check announcementId in search params or body
    const url = new URL(request.url);
    let announcementId = url.searchParams.get('announcementId');

    if (!announcementId) {
      try {
        const body = await request.json();
        announcementId = body?.announcementId;
      } catch {
        // Body may be empty if provided via search query
      }
    }

    if (!announcementId) {
      return NextResponse.json({ message: 'Announcement ID is required.' }, { status: 400 });
    }

    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { id: true, authorId: true, courseId: true },
    });

    if (!announcement || announcement.courseId !== courseId) {
      return NextResponse.json({ message: 'Announcement not found.' }, { status: 404 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    const isAuthor = announcement.authorId === session.user.id;
    const isInstructor = course?.instructorId === session.user.id;
    const isAdmin = role === 'ADMIN';

    if (!isAuthor && !isInstructor && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized to delete this announcement.' }, { status: 403 });
    }

    await db.announcement.delete({
      where: { id: announcementId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('COURSE_STREAM_DELETE_ERROR', error);
    return NextResponse.json({ message: 'Failed to delete announcement.' }, { status: 500 });
  }
}
