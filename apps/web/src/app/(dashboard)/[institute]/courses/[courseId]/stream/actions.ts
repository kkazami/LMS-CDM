"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";

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
      select: { instructorId: true },
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

    revalidatePath(
      `/(dashboard)/${instituteCode}/courses/${courseId}/stream`
    );
    return { message: "success" };
  } catch (error) {
    console.error("createAnnouncement error:", error);
    return { message: "Failed to post announcement." };
  }
}
