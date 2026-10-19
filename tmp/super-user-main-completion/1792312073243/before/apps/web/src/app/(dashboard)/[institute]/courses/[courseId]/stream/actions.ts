"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { createNotificationsForCourseStudents } from "@/lib/notifications";

const announcementSchema = z.object({
  content: z.string().min(1, "Announcement cannot be empty."),
  courseId: z.string(),
  instituteCode: z.string(),
});

export async function createAnnouncement(
  prevState: { message: string },
  formData: FormData
) {
  const session = await getSession();
  if (!session) return { message: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { message: "Only instructors can post announcements." };
  }

  const parse = announcementSchema.safeParse({
    content: formData.get("content"),
    courseId: formData.get("courseId"),
    instituteCode: formData.get("instituteCode"),
  });

  if (!parse.success) {
    return { message: "Validation failed." };
  }

  const { content, courseId, instituteCode } = parse.data;

  try {
    // Verify the user is the course instructor or admin
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true, code: true, title: true },
    });

    if (!course) return { message: "Course not found." };

    const isInstructor = course.instructorId === session.user.id;
    const isAdmin = role === "ADMIN";

    if (!isInstructor && !isAdmin) {
      return { message: "You are not authorized for this course." };
    }

    await db.announcement.create({
      data: {
        content,
        courseId,
        authorId: session.user.id,
      },
    });

    // ── Notify all enrolled students about the new announcement ──
    const previewText = content.length > 60 ? content.slice(0, 57) + "…" : content;
    await createNotificationsForCourseStudents(courseId, {
      type: "ANNOUNCEMENT",
      title: "New Announcement",
      message: `New announcement in ${course.code}: ${previewText}`,
      link: `/${instituteCode}/announcements`,
    });

    revalidatePath(
      `/(dashboard)/${instituteCode}/courses/${courseId}/stream`
    );
    revalidatePath(`/(dashboard)/${instituteCode}/announcements`);
    return { message: "success" };
  } catch (error) {
    console.error("createAnnouncement error:", error);
    return { message: "Failed to post announcement." };
  }
}

export async function updateAnnouncement(
  announcementId: string,
  content: string,
  courseId: string,
  instituteCode: string
) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can edit announcements." };
  }

  if (!content.trim()) {
    return { success: false, error: "Content cannot be empty." };
  }

  try {
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { authorId: true, courseId: true },
    });

    if (!announcement) return { success: false, error: "Announcement not found." };

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    const isAuthor = announcement.authorId === session.user.id;
    const isInstructor = course?.instructorId === session.user.id;
    const isAdmin = role === "ADMIN";

    if (!isAuthor && !isInstructor && !isAdmin) {
      return { success: false, error: "Unauthorized to edit this announcement." };
    }

    await db.announcement.update({
      where: { id: announcementId },
      data: { content },
    });

    revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/stream`);
    revalidatePath(`/(dashboard)/${instituteCode}/announcements`);
    return { success: true };
  } catch (error) {
    console.error("updateAnnouncement error:", error);
    return { success: false, error: "Failed to update announcement." };
  }
}

export async function deleteAnnouncement(
  announcementId: string,
  courseId: string,
  instituteCode: string
) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can delete announcements." };
  }

  try {
    const announcement = await db.announcement.findUnique({
      where: { id: announcementId },
      select: { authorId: true, courseId: true },
    });

    if (!announcement) return { success: false, error: "Announcement not found." };

    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true },
    });

    const isAuthor = announcement.authorId === session.user.id;
    const isInstructor = course?.instructorId === session.user.id;
    const isAdmin = role === "ADMIN";

    if (!isAuthor && !isInstructor && !isAdmin) {
      return { success: false, error: "Unauthorized to delete this announcement." };
    }

    await db.announcement.delete({
      where: { id: announcementId },
    });

    revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/stream`);
    revalidatePath(`/(dashboard)/${instituteCode}/announcements`);
    return { success: true };
  } catch (error) {
    console.error("deleteAnnouncement error:", error);
    return { success: false, error: "Failed to delete announcement." };
  }
}

