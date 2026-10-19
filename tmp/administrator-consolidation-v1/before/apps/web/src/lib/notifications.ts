import { db } from "@/lib/db";

/**
 * Notification types corresponding to real LMS events.
 */
export type NotificationType = "ANNOUNCEMENT" | "GRADE" | "CLASSWORK" | "REMINDER" | "ALERT" | "BROADCAST";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
}

/**
 * Create a single notification for a specific user.
 * Used for grade notifications (one student at a time).
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      },
    });
  } catch (error) {
    // Don't let notification failures break the primary action
    console.error("NOTIFICATION_CREATE_ERROR", error);
  }
}

/**
 * Create notifications for ALL approved students enrolled in a course.
 * Used for announcements and new classwork items.
 */
export async function createNotificationsForCourseStudents(
  courseId: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const enrollments = await db.enrollment.findMany({
      where: {
        courseId,
        status: "APPROVED",
      },
      select: {
        studentId: true,
      },
    });

    if (enrollments.length === 0) return;

    await db.notification.createMany({
      data: enrollments.map((e) => ({
        userId: e.studentId,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
      })),
    });
  } catch (error) {
    // Don't let notification failures break the primary action
    console.error("NOTIFICATION_BULK_CREATE_ERROR", error);
  }
}
