"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";

async function ensureCourseInstructor(courseId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const role = session.user.role.toUpperCase();
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });

  if (!course) throw new Error("Course not found");

  const isInstructor = course.instructorId === session.user.id;
  const isAdmin = role === "ADMIN";

  if (!isInstructor && !isAdmin) {
    throw new Error("You are not authorized to modify this course's classwork.");
  }

  return session.user;
}

const syllabusItemSchema = z.object({
  id: z.string().optional(),
  courseId: z.string(),
  type: z.string().min(1, "Type is required."),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional().default(""),
  dueDate: z.string().optional().nullable(),
  maxPoints: z.string().optional().nullable(),
  targetGroupIds: z.string().optional().default(""),
  attachments: z.string().optional().default("[]"), // JSON array of {type, url, fileName}
  instituteCode: z.string(),
});

export async function createSyllabusItem(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  const parse = syllabusItemSchema.safeParse({
    courseId: formData.get("courseId"),
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueDate: formData.get("dueDate") || null,
    maxPoints: formData.get("maxPoints") || null,
    targetGroupIds: formData.get("targetGroupIds") || "",
    attachments: formData.get("attachments") || "[]",
    instituteCode: formData.get("instituteCode"),
  });

  if (!parse.success) {
    return {
      errors: parse.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const data = parse.data;

  try {
    await ensureCourseInstructor(data.courseId);

    // Get the next order index
    const lastItem = await db.syllabusItem.findFirst({
      where: { courseId: data.courseId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });

    const item = await db.course.findUnique({
      where: { id: data.courseId },
      select: { id: true },
    });

    if (!item) return { message: "Course not found." };

    const syllabusItem = await db.syllabusItem.create({
      data: {
        courseId: data.courseId,
        type: data.type,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        maxPoints: data.maxPoints ? parseInt(data.maxPoints, 10) : null,
        orderIndex: (lastItem?.orderIndex ?? -1) + 1,
      },
    });

    // Handle target groups
    if (data.targetGroupIds) {
      const groupIds = data.targetGroupIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (groupIds.length > 0) {
        await db.syllabusTargetGroup.createMany({
          data: groupIds.map((groupId) => ({
            syllabusItemId: syllabusItem.id,
            groupId,
          })),
        });
      }
    }

    // Handle attachments
    try {
      const attachmentList = JSON.parse(data.attachments || "[]") as Array<{
        type: string;
        url: string;
        fileName?: string;
      }>;
      if (attachmentList.length > 0) {
        await db.attachment.createMany({
          data: attachmentList.map((a) => ({
            syllabusItemId: syllabusItem.id,
            type: a.type || "FILE",
            url: a.url,
            fileName: a.fileName || "",
          })),
        });
      }
    } catch {
      // Invalid JSON — skip attachments silently
    }

    revalidatePath(
      `/(dashboard)/${data.instituteCode}/courses/${data.courseId}/classwork`
    );
    return { message: "success" };
  } catch (error) {
    console.error("createSyllabusItem error:", error);
    return { message: error instanceof Error ? error.message : "Failed to create item." };
  }
}

export async function updateSyllabusItem(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  const parse = syllabusItemSchema.safeParse({
    id: formData.get("id"),
    courseId: formData.get("courseId"),
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueDate: formData.get("dueDate") || null,
    maxPoints: formData.get("maxPoints") || null,
    targetGroupIds: formData.get("targetGroupIds") || "",
    attachments: formData.get("attachments") || "[]",
    instituteCode: formData.get("instituteCode"),
  });

  if (!parse.success) {
    return {
      errors: parse.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const data = parse.data;
  const itemId = formData.get("id") as string;

  if (!itemId) return { message: "Item ID is required." };

  try {
    await ensureCourseInstructor(data.courseId);

    await db.syllabusItem.update({
      where: { id: itemId },
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        maxPoints: data.maxPoints ? parseInt(data.maxPoints, 10) : null,
      },
    });

    // Replace target groups
    await db.syllabusTargetGroup.deleteMany({
      where: { syllabusItemId: itemId },
    });

    if (data.targetGroupIds) {
      const groupIds = data.targetGroupIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (groupIds.length > 0) {
        await db.syllabusTargetGroup.createMany({
          data: groupIds.map((groupId) => ({
            syllabusItemId: itemId,
            groupId,
          })),
        });
      }
    }

    // Replace attachments
    await db.attachment.deleteMany({ where: { syllabusItemId: itemId } });
    try {
      const attachmentList = JSON.parse(data.attachments || "[]") as Array<{
        type: string;
        url: string;
        fileName?: string;
      }>;
      if (attachmentList.length > 0) {
        await db.attachment.createMany({
          data: attachmentList.map((a) => ({
            syllabusItemId: itemId,
            type: a.type || "FILE",
            url: a.url,
            fileName: a.fileName || "",
          })),
        });
      }
    } catch {
      // Invalid JSON — skip
    }

    revalidatePath(
      `/(dashboard)/${data.instituteCode}/courses/${data.courseId}/classwork`
    );
    return { message: "success" };
  } catch (error) {
    console.error("updateSyllabusItem error:", error);
    return { message: error instanceof Error ? error.message : "Failed to update item." };
  }
}

export async function deleteSyllabusItem(
  itemId: string,
  courseId: string,
  instituteCode: string
) {
  try {
    await ensureCourseInstructor(courseId);

    await db.syllabusItem.delete({ where: { id: itemId } });

    revalidatePath(
      `/(dashboard)/${instituteCode}/courses/${courseId}/classwork`
    );
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item.",
    };
  }
}
