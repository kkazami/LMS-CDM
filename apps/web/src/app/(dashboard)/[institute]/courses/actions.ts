"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth-session";

async function ensureRole(allowedRoles: string[]) {
  const session = await getSession();
  if (!session || !session.user || !allowedRoles.includes(session.user.role)) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

const courseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, "Code must be at least 2 characters."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  instituteCode: z.string(),
});

export async function createCourse(prevState: any, formData: FormData) {
  const user = await ensureRole(["ADMIN", "PROFESSOR"]);

  const parse = courseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    instituteCode: formData.get("instituteCode"),
  });

  if (!parse.success) {
    return { errors: parse.error.flatten().fieldErrors, message: "Validation failed." };
  }

  const { code, title, instituteCode } = parse.data;

  try {
    const institute = await db.institute.findUnique({ where: { code: instituteCode } });
    if (!institute) return { message: "Institute not found." };

    await db.course.create({
      data: {
        code,
        title,
        instituteId: institute.id, // Strictly scoping to the institute
      },
    });

    revalidatePath(`/(dashboard)/${instituteCode}/courses`);
    return { message: "success" };
  } catch (error) {
    return { message: "Failed to create course." };
  }
}

export async function updateCourse(prevState: any, formData: FormData) {
  const user = await ensureRole(["ADMIN", "PROFESSOR"]);

  const parse = courseSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    title: formData.get("title"),
    instituteCode: formData.get("instituteCode"),
  });

  if (!parse.success || !parse.data.id) {
    return { errors: parse.error?.flatten().fieldErrors, message: "Validation failed." };
  }

  const { id, code, title, instituteCode } = parse.data;

  try {
    const institute = await db.institute.findUnique({ where: { code: instituteCode } });
    if (!institute) return { message: "Institute not found." };

    // STRICT MULTI-TENANCY: Verify the existing course actually belongs to this institute
    const existingCourse = await db.course.findUnique({ where: { id } });
    if (!existingCourse || existingCourse.instituteId !== institute.id) {
      return { message: "Course not found or unauthorized for this institute." };
    }

    await db.course.update({
      where: { id },
      data: { code, title },
    });

    revalidatePath(`/(dashboard)/${instituteCode}/courses`);
    return { message: "success" };
  } catch (error) {
    return { message: "Failed to update course." };
  }
}

export async function deleteCourse(courseId: string, instituteCode: string) {
  const user = await ensureRole(["ADMIN", "PROFESSOR"]);

  try {
    const institute = await db.institute.findUnique({ where: { code: instituteCode } });
    if (!institute) return { success: false, error: "Institute not found." };

    // STRICT MULTI-TENANCY: Verify the course belongs to the institute before deleting
    const existingCourse = await db.course.findUnique({ where: { id: courseId } });
    if (!existingCourse || existingCourse.instituteId !== institute.id) {
      return { success: false, error: "Course not found or unauthorized for this institute." };
    }

    await db.course.delete({ where: { id: courseId } });
    revalidatePath(`/(dashboard)/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete course." };
  }
}
