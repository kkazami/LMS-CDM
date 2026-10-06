import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/broadcast
 * Returns broadcast history and enrolled students for the course.
 */
export async function GET(request: Request, context: RouteContext) {
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

    const [enrollments, broadcasts] = await Promise.all([
      db.enrollment.findMany({
        where: { courseId, status: 'APPROVED' },
        include: {
          student: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { student: { name: 'asc' } },
      }),
      db.notificationBroadcast.findMany({
        where: { courseId },
        include: {
          sender: {
            select: { name: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const enrolledStudents = enrollments.map((e) => ({
      id: e.student.id,
      name: e.student.name,
      email: e.student.email,
      avatarUrl: e.student.avatarUrl,
    }));

    // Resolve student names for scoped broadcasts
    const allStudentIds = new Set<string>();
    for (const b of broadcasts) {
      if (b.scope !== 'ALL') {
        try {
          const ids = (b.scope.startsWith('[') ? JSON.parse(b.scope) : b.scope.split(',')) as string[];
          ids.forEach((id) => {
            const cleanId = id.trim();
            if (cleanId) allStudentIds.add(cleanId);
          });
        } catch {
          // ignore parsing error
        }
      }
    }

    const studentNameMap: Record<string, string> = {};
    if (allStudentIds.size > 0) {
      const students = await db.user.findMany({
        where: { id: { in: Array.from(allStudentIds) } },
        select: { id: true, name: true },
      });
      for (const s of students) {
        studentNameMap[s.id] = s.name;
      }
    }

    const serializedBroadcasts = broadcasts.map((b) => {
      let scopeLabel: string;
      if (b.scope === 'ALL') {
        scopeLabel = `Entire class (${b.recipientCount} student${b.recipientCount !== 1 ? 's' : ''})`;
      } else {
        try {
          const ids = (b.scope.startsWith('[') ? JSON.parse(b.scope) : b.scope.split(',')) as string[];
          const names = ids.map((id) => studentNameMap[id.trim()] || 'Student').join(', ');
          scopeLabel = names || `${b.recipientCount} student${b.recipientCount !== 1 ? 's' : ''}`;
        } catch {
          scopeLabel = `${b.recipientCount} student${b.recipientCount !== 1 ? 's' : ''}`;
        }
      }

      return {
        id: b.id,
        senderId: b.senderId,
        message: b.message,
        category: b.category,
        scope: b.scope,
        scopeLabel,
        recipientCount: b.recipientCount,
        createdAt: b.createdAt.toISOString(),
        senderName: b.sender.name,
        senderAvatar: b.sender.avatarUrl,
      };
    });

    return NextResponse.json({
      broadcasts: serializedBroadcasts,
      enrolledStudents,
    });
  } catch (error) {
    console.error('COURSE_BROADCAST_GET_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch broadcasts.' }, { status: 500 });
  }
}

/**
 * PATCH /api/courses/[courseId]/broadcast
 * Updates a previously sent broadcast message/category and updates corresponding notifications.
 */
export async function PATCH(request: Request, context: RouteContext) {
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
    const body = await request.json();
    const { broadcastId, message, category } = body;

    if (!broadcastId || typeof broadcastId !== 'string') {
      return NextResponse.json({ message: 'Broadcast ID is required.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ message: 'Broadcast message cannot be empty.' }, { status: 400 });
    }

    const broadcast = await db.notificationBroadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast || broadcast.courseId !== courseId) {
      return NextResponse.json({ message: 'Broadcast not found.' }, { status: 404 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true, code: true },
    });

    const isAuthor = broadcast.senderId === session.user.id;
    const isInstructor = course?.instructorId === session.user.id;
    const isAdmin = role === 'ADMIN';

    if (!isAuthor && !isInstructor && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized to edit this broadcast.' }, { status: 403 });
    }

    const oldMessage = broadcast.message;
    const updated = await db.notificationBroadcast.update({
      where: { id: broadcastId },
      data: {
        message: message.trim(),
        ...(category ? { category: category.toUpperCase() } : {}),
      },
      include: {
        sender: {
          select: { name: true, avatarUrl: true },
        },
      },
    });

    // Update matching student notification records
    await db.notification.updateMany({
      where: {
        message: oldMessage,
        link: { contains: courseId },
        type: { in: ['BROADCAST', 'ALERT', 'REMINDER'] },
      },
      data: {
        message: message.trim(),
        ...(category
          ? {
              type:
                category.toUpperCase() === 'ALERT'
                  ? 'ALERT'
                  : category.toUpperCase() === 'REMINDER'
                    ? 'REMINDER'
                    : 'BROADCAST',
            }
          : {}),
      },
    });

    return NextResponse.json({
      success: true,
      broadcast: {
        id: updated.id,
        senderId: updated.senderId,
        message: updated.message,
        category: updated.category,
        createdAt: updated.createdAt.toISOString(),
        senderName: updated.sender.name,
        senderAvatar: updated.sender.avatarUrl,
        recipientCount: updated.recipientCount,
      },
    });
  } catch (error) {
    console.error('COURSE_BROADCAST_PATCH_ERROR', error);
    return NextResponse.json({ message: 'Failed to update broadcast.' }, { status: 500 });
  }
}

/**
 * DELETE /api/courses/[courseId]/broadcast
 * Deletes a broadcast from history and revokes corresponding student notifications.
 */
export async function DELETE(request: Request, context: RouteContext) {
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
    const url = new URL(request.url);
    let broadcastId = url.searchParams.get('broadcastId');

    if (!broadcastId) {
      try {
        const body = await request.json();
        broadcastId = body?.broadcastId;
      } catch {
        // ignore
      }
    }

    if (!broadcastId) {
      return NextResponse.json({ message: 'Broadcast ID is required.' }, { status: 400 });
    }

    const broadcast = await db.notificationBroadcast.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast || broadcast.courseId !== courseId) {
      return NextResponse.json({ message: 'Broadcast not found.' }, { status: 404 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    const isAuthor = broadcast.senderId === session.user.id;
    const isInstructor = course?.instructorId === session.user.id;
    const isAdmin = role === 'ADMIN';

    if (!isAuthor && !isInstructor && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized to delete this broadcast.' }, { status: 403 });
    }

    const oldMessage = broadcast.message;

    await db.notificationBroadcast.delete({
      where: { id: broadcastId },
    });

    // Revoke matching student notification records
    await db.notification.deleteMany({
      where: {
        message: oldMessage,
        link: { contains: courseId },
        type: { in: ['BROADCAST', 'ALERT', 'REMINDER'] },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('COURSE_BROADCAST_DELETE_ERROR', error);
    return NextResponse.json({ message: 'Failed to delete broadcast.' }, { status: 500 });
  }
}

/**
 * POST /api/courses/[courseId]/broadcast
 * Broadcasts a notification alert to enrolled students in a course.
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
      select: {
        id: true,
        instructorId: true,
        title: true,
        code: true,
        institute: { select: { code: true } },
      },
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

    // Resolve target student IDs
    let targetStudentIds: string[] = [];
    let serializedScope = 'ALL';

    if (scope === 'ALL') {
      const enrollments = await db.enrollment.findMany({
        where: { courseId, status: 'APPROVED' },
        select: { studentId: true },
      });
      targetStudentIds = enrollments.map((e) => e.studentId);
      serializedScope = 'ALL';
    } else {
      let requestedIds: string[] = [];
      if (Array.isArray(scope)) {
        requestedIds = scope;
      } else if (typeof scope === 'string') {
        try {
          if (scope.startsWith('[')) {
            requestedIds = JSON.parse(scope);
          } else {
            requestedIds = scope.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        } catch {
          requestedIds = scope.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const validEnrollments = await db.enrollment.findMany({
        where: {
          courseId,
          status: 'APPROVED',
          studentId: { in: requestedIds },
        },
        select: { studentId: true },
      });

      targetStudentIds = validEnrollments.map((e) => e.studentId);
      if (targetStudentIds.length === 0) {
        return NextResponse.json({ message: 'No valid enrolled students selected.' }, { status: 400 });
      }
      serializedScope = JSON.stringify(targetStudentIds);
    }

    if (targetStudentIds.length === 0) {
      return NextResponse.json({ message: 'No enrolled students to notify.' }, { status: 400 });
    }

    const broadcast = await db.notificationBroadcast.create({
      data: {
        courseId,
        senderId: session.user.id,
        message: message.trim(),
        category: category.toUpperCase(),
        scope: serializedScope,
        recipientCount: targetStudentIds.length,
      },
      include: {
        sender: {
          select: { name: true, avatarUrl: true },
        },
      },
    });

    const categoryUpper = category.toUpperCase();
    const categoryLabel =
      categoryUpper === 'ALERT' || categoryUpper === 'URGENT'
        ? 'Alert from Instructor'
        : categoryUpper === 'REMINDER' || categoryUpper === 'EXAM'
          ? 'Reminder from Instructor'
          : 'Message from Instructor';

    const notificationType =
      categoryUpper === 'ALERT' || categoryUpper === 'URGENT'
        ? 'ALERT'
        : categoryUpper === 'REMINDER' || categoryUpper === 'EXAM'
          ? 'REMINDER'
          : 'BROADCAST';

    const instituteCode = course.institute?.code || 'ics';

    // Dispatch notifications to each targeted student
    await db.notification.createMany({
      data: targetStudentIds.map((studentId) => ({
        userId: studentId,
        type: notificationType,
        title: `[${course.code}] ${categoryLabel}`,
        message: message.trim(),
        link: `/${instituteCode}/courses/${courseId}/stream`,
      })),
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
