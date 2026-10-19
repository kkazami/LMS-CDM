import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { createNotificationsForCourseStudents } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * POST /api/courses/[courseId]/broadcast
 * Broadcasts an urgent notification alert to all enrolled students in a course.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== 'PROFESSOR' && role !== 'TEACHER' && role !== 'ADMIN') {
      return NextResponse.json({ message: 'Instructors only.' }, { status: 403 });
    }

    const { courseId } = await context.params;
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true, title: true, code: true },
    });

    if (!course) {
      return NextResponse.json({ message: 'Course not found.' }, { status: 404 });
    }

    if (role !== 'ADMIN' && course.instructorId !== session.user.id) {
      return NextResponse.json({ message: 'You are not the instructor for this course.' }, { status: 403 });
    }

    const body = await request.json();
    const { message, category = 'GENERAL', scope = 'ALL' } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ message: 'Broadcast message cannot be empty.' }, { status: 400 });
    }

    const approvedCount = await db.enrollment.count({
      where: { courseId, status: 'APPROVED' },
    });

    const broadcast = await db.notificationBroadcast.create({
      data: {
        courseId,
        senderId: session.user.id,
        message: message.trim(),
        category: category.toUpperCase(),
        scope,
        recipientCount: approvedCount,
      },
      include: {
        sender: {
          select: { name: true, avatarUrl: true },
        },
      },
    });

    // Notify all approved students in this course
    const categoryLabel =
      category.toUpperCase() === 'ALERT'
        ? 'URGENT ALERT'
        : category.toUpperCase() === 'REMINDER'
          ? 'REMINDER'
          : 'ANNOUNCEMENT';

    await createNotificationsForCourseStudents(courseId, {
      type: 'BROADCAST',
      title: `[${course.code}] ${categoryLabel}`,
      message: message.trim(),
      link: `/${courseId}/stream`,
    });

    return NextResponse.json({
      success: true,
      broadcast: {
        id: broadcast.id,
        message: broadcast.message,
        category: broadcast.category,
        createdAt: broadcast.createdAt.toISOString(),
        senderName: broadcast.sender.name,
        senderAvatar: broadcast.sender.avatarUrl,
        recipientCount: broadcast.recipientCount,
      },
    });
  } catch (error) {
    console.error('COURSE_BROADCAST_POST_ERROR', error);
    return NextResponse.json({ message: 'Failed to send broadcast.' }, { status: 500 });
  }
}
