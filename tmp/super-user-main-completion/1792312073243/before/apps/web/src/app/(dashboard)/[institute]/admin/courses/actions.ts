"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { generateCourseCode, bulkAssignInstructor } from "@/lib/skills";

async function ensureAdmin() {
  const session = await getSession();
  if (!session || !session.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user;
}

const adminCourseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, "Course code must be at least 2 characters."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  section: z.string().optional().default(""),
  subject: z.string().min(1, "Subject is required."),
  room: z.string().optional().default(""),
  description: z.string().optional().default(""),
  instructorId: z.string().optional().default(""),
  instituteCode: z.string(),
});

export async function adminCreateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await ensureAdmin();

  const parse = adminCourseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    section: formData.get("section") || "",
    subject: formData.get("subject"),
    room: formData.get("room") || "",
    description: formData.get("description") || "",
    instructorId: formData.get("instructorId") || "",
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
    const institute = await db.institute.findUnique({
      where: { code: data.instituteCode },
    });
    if (!institute) return { message: "Institute not found." };

    // Use the Agentic Skill to generate a unique course code
    const codeResult = await generateCourseCode();
    if (!codeResult.success || !codeResult.data) {
      return { message: "Failed to generate course code." };
    }

    const course = await db.course.create({
      data: {
        code: data.code,
        courseCode: codeResult.data,
        title: data.title,
        section: data.section,
        subject: data.subject,
        room: data.room,
        description: data.description,
        instructorId: data.instructorId || null,
        instituteId: institute.id,
      },
    });

    // If instructor was specified, use the bulk assign skill for validation
    if (data.instructorId) {
      await bulkAssignInstructor({
        assignments: [{ courseId: course.id, instructorId: data.instructorId }],
        instituteId: institute.id,
      });
    }

    revalidatePath(`/(dashboard)/${data.instituteCode}/admin/courses`);
    return { message: "success" };
  } catch (error) {
    console.error("adminCreateCourse error:", error);
    return { message: "Failed to create course." };
  }
}

export async function adminUpdateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await ensureAdmin();

  const parse = adminCourseSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    title: formData.get("title"),
    section: formData.get("section") || "",
    subject: formData.get("subject"),
    room: formData.get("room") || "",
    description: formData.get("description") || "",
    instructorId: formData.get("instructorId") || "",
    instituteCode: formData.get("instituteCode"),
  });

  if (!parse.success || !parse.data.id) {
    return {
      errors: parse.error?.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const data = parse.data;

  try {
    const institute = await db.institute.findUnique({
      where: { code: data.instituteCode },
    });
    if (!institute) return { message: "Institute not found." };

    // Multi-tenancy check
    const existing = await db.course.findUnique({
      where: { id: data.id },
    });
    if (!existing || existing.instituteId !== institute.id) {
      return { message: "Course not found or unauthorized." };
    }

    await db.course.update({
      where: { id: data.id },
      data: {
        code: data.code,
        title: data.title,
        section: data.section,
        subject: data.subject,
        room: data.room,
        description: data.description,
        instructorId: data.instructorId || null,
      },
    });

    revalidatePath(`/(dashboard)/${data.instituteCode}/admin/courses`);
    return { message: "success" };
  } catch (error) {
    console.error("adminUpdateCourse error:", error);
    return { message: "Failed to update course." };
  }
}

export async function adminDeleteCourse(
  courseId: string,
  instituteCode: string
) {
  await ensureAdmin();

  try {
    const institute = await db.institute.findUnique({
      where: { code: instituteCode },
    });
    if (!institute)
      return { success: false, error: "Institute not found." };

    const existing = await db.course.findUnique({
      where: { id: courseId },
    });
    if (!existing || existing.instituteId !== institute.id) {
      return { success: false, error: "Course not found or unauthorized." };
    }

    await db.course.delete({ where: { id: courseId } });
    revalidatePath(`/(dashboard)/${instituteCode}/admin/courses`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete course." };
  }
}

export async function getInstructors(instituteCode: string) {
  const institute = await db.institute.findUnique({
    where: { code: instituteCode },
  });
  if (!institute) return [];

  return db.user.findMany({
    where: {
      instituteId: institute.id,
      role: { in: ["PROFESSOR", "TEACHER"] },
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
