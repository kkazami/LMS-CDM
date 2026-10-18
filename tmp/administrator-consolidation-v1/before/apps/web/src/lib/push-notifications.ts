import { db } from './db';

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Dispatches an instant in-app and push notification to a target user.
 */
export async function sendNotificationToUser(
  userId: string,
  payload: {
    type: 'ANNOUNCEMENT' | 'GRADE' | 'CLASSWORK' | 'REMINDER' | 'ALERT' | 'BROADCAST';
    title: string;
    message: string;
    link?: string;
  }
) {
  try {
    // 1. Create durable in-app notification in database
    const notification = await db.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link || '',
        isRead: false,
      },
    });

    return notification;
  } catch (error) {
    console.error('[PushNotification] Error sending notification to user:', error);
    return null;
  }
}

/**
 * Dispatches instant notifications to all enrolled students in a course.
 */
export async function notifyCourseStudents(
  courseId: string,
  payload: {
    type: 'ANNOUNCEMENT' | 'GRADE' | 'CLASSWORK' | 'REMINDER' | 'ALERT';
    title: string;
    message: string;
    link?: string;
  }
) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        status: 'APPROVED',
      },
      select: {
        studentId: true,
      },
    });

    if (enrollments.length === 0) return 0;

    await db.notification.createMany({
      data: enrollments.map((e) => ({
        userId: e.studentId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        link: payload.link || '',
        isRead: false,
      })),
    });

    return enrollments.length;
  } catch (error) {
    console.error('[PushNotification] Error broadcasting to course:', error);
    return 0;
  }
}
