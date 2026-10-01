"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";

const broadcastSchema = z.object({
  courseId: z.string().min(1),
  instituteCode: z.string().min(1),
  message: z.string().min(1, "Message cannot be empty.").max(500),
  category: z.enum(["GENERAL", "REMINDER", "ALERT"]),
  scope: z.string().min(1), // "ALL" or comma-separated student IDs
});

/**
 * Map broadcast category → Notification type shown in the bell dropdown.
 */
function categoryToNotificationType(category: string): string {
  switch (category) {
    case "REMINDER":
      return "REMINDER";
    case "ALERT":
      return "ALERT";
    default:
      return "BROADCAST";
  }
}

/**
 * Map broadcast category → human-readable title for the notification.
 */
function categoryToTitle(category: string): string {
  switch (category) {
    case "REMINDER":
      return "Reminder from Instructor";
    case "ALERT":
      return "Alert from Instructor";
    default:
      return "Message from Instructor";
  }
}

export async function sendBroadcast(
  prevState: { message: string },
  formData: FormData
) {
  const session = await getSession();
  if (!session) return { message: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { message: "Only instructors can send broadcasts." };
  }

  const parse = broadcastSchema.safeParse({
    courseId: formData.get("courseId"),
    instituteCode: formData.get("instituteCode"),
    message: formData.get("message"),
    category: formData.get("category"),
    scope: formData.get("scope"),
  });

  if (!parse.success) {
    const firstError = parse.error.issues[0]?.message || "Validation failed.";
    return { message: firstError };
  }

  const { courseId, instituteCode, message, category, scope } = parse.data;

  try {
    // Verify the user is the course instructor or admin
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true, code: true },
    });

    if (!course) return { message: "Course not found." };

    const isInstructor = course.instructorId === session.user.id;
    const isAdmin = role === "ADMIN";

    if (!isInstructor && !isAdmin) {
      return { message: "You are not authorized for this course." };
    }

    // Resolve target student IDs
    let targetStudentIds: string[];

    if (scope === "ALL") {
      const enrollments = await db.enrollment.findMany({
        where: { courseId, status: "APPROVED" },
        select: { studentId: true },
      });
      targetStudentIds = enrollments.map((e) => e.studentId);
    } else {
      // Scope is comma-separated student IDs — validate they are actually enrolled
      const requestedIds = scope.split(",").map((s) => s.trim()).filter(Boolean);

      const validEnrollments = await db.enrollment.findMany({
        where: {
          courseId,
          status: "APPROVED",
          studentId: { in: requestedIds },
        },
        select: { studentId: true },
      });

      targetStudentIds = validEnrollments.map((e) => e.studentId);

      if (targetStudentIds.length === 0) {
        return { message: "No valid enrolled students found in the selection." };
      }
    }

    if (targetStudentIds.length === 0) {
      return { message: "No enrolled students to notify." };
    }

    // Create Notification records for each targeted student
    const notificationType = categoryToNotificationType(category);
    const notificationTitle = categoryToTitle(category);

    await db.notification.createMany({
      data: targetStudentIds.map((studentId) => ({
        userId: studentId,
        type: notificationType,
        title: notificationTitle,
        message: `${course.code}: ${message}`,
        link: `/${instituteCode}/courses/${courseId}/stream`,
      })),
    });

    // Log the broadcast for history
    await db.notificationBroadcast.create({
      data: {
        courseId,
        senderId: session.user.id,
        message,
        category,
        scope: scope === "ALL" ? "ALL" : JSON.stringify(targetStudentIds),
        recipientCount: targetStudentIds.length,
      },
    });

    revalidatePath(
      `/(dashboard)/${instituteCode}/courses/${courseId}/broadcast`
    );
    return { message: "success" };
  } catch (error) {
    console.error("sendBroadcast error:", error);
    return { message: "Failed to send broadcast." };
  }
}

/**
 * Update an existing broadcast message & category, and synchronize student notifications.
 */
export async function updateBroadcast(data: {
  broadcastId: string;
  courseId: string;
  instituteCode: string;
  message: string;
  category: "GENERAL" | "REMINDER" | "ALERT";
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can edit broadcasts." };
  }

  const { broadcastId, courseId, instituteCode, message, category } = data;

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return { success: false, error: "Message cannot be empty." };
  }
  if (trimmedMessage.length > 500) {
    return { success: false, error: "Message cannot exceed 500 characters." };
  }

  try {
    const broadcast = await db.notificationBroadcast.findUnique({
      where: { id: broadcastId },
      include: {
        course: {
          select: { instructorId: true, code: true },
        },
      },
    });

    if (!broadcast || broadcast.courseId !== courseId) {
      return { success: false, error: "Broadcast not found." };
    }

    const isSender = broadcast.senderId === session.user.id;
    const isInstructor = broadcast.course.instructorId === session.user.id;
    const isAdmin = role === "ADMIN";

    if (!isSender && !isInstructor && !isAdmin) {
      return { success: false, error: "You are not authorized to edit this broadcast." };
    }

    const oldFormattedMessage = `${broadcast.course.code}: ${broadcast.message}`;
    const newFormattedMessage = `${broadcast.course.code}: ${trimmedMessage}`;
    const newTitle = categoryToTitle(category);
    const newType = categoryToNotificationType(category);

    // Update broadcast record
    await db.notificationBroadcast.update({
      where: { id: broadcastId },
      data: {
        message: trimmedMessage,
        category,
      },
    });

    // Synchronize existing student notifications (within a 5-minute window around broadcast creation)
    const windowStart = new Date(broadcast.createdAt.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(broadcast.createdAt.getTime() + 5 * 60 * 1000);

    await db.notification.updateMany({
      where: {
        link: `/${instituteCode}/courses/${courseId}/stream`,
        message: oldFormattedMessage,
        createdAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      data: {
        title: newTitle,
        type: newType,
        message: newFormattedMessage,
      },
    });

    revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/broadcast`);
    return { success: true };
  } catch (error) {
    console.error("updateBroadcast error:", error);
    return { success: false, error: "Failed to update broadcast." };
  }
}

/**
 * Delete a broadcast from history and retract its corresponding student notifications.
 */
export async function deleteBroadcast(data: {
  broadcastId: string;
  courseId: string;
  instituteCode: string;
}) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can delete broadcasts." };
  }

  const { broadcastId, courseId, instituteCode } = data;

  try {
    const broadcast = await db.notificationBroadcast.findUnique({
      where: { id: broadcastId },
      include: {
        course: {
          select: { instructorId: true, code: true },
        },
      },
    });

    if (!broadcast || broadcast.courseId !== courseId) {
      return { success: false, error: "Broadcast not found." };
    }

    const isSender = broadcast.senderId === session.user.id;
    const isInstructor = broadcast.course.instructorId === session.user.id;
    const isAdmin = role === "ADMIN";

    if (!isSender && !isInstructor && !isAdmin) {
      return { success: false, error: "You are not authorized to delete this broadcast." };
    }

    const formattedMessage = `${broadcast.course.code}: ${broadcast.message}`;

    // Retract student notifications within 5 minutes of broadcast creation
    const windowStart = new Date(broadcast.createdAt.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(broadcast.createdAt.getTime() + 5 * 60 * 1000);

    await db.notification.deleteMany({
      where: {
        link: `/${instituteCode}/courses/${courseId}/stream`,
        message: formattedMessage,
        createdAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    // Delete broadcast record
    await db.notificationBroadcast.delete({
      where: { id: broadcastId },
    });

    revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/broadcast`);
    return { success: true };
  } catch (error) {
    console.error("deleteBroadcast error:", error);
    return { success: false, error: "Failed to delete broadcast." };
  }
}

