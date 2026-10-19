"use server";
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';


import { administratorInstitute, administratorInstructor } from '@/lib/administrator-scope';
import { z } from "zod";
import { validateCourseProgram, setCourseProgram } from "@/lib/course-program";
import { AccessError } from "@/lib/super-user-v1/actor";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { generateCourseCode, bulkAssignInstructor } from "@/lib/skills";
import { courseOffering } from '@/lib/roster/terms';

async function ensureAdmin() {
  const session = await getSession();
  if (!session || !session.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Admin access required");
  }
  return session.user;
}

const adminCourseSchema = z.object({
  id: z.string().optional(),
  termId: z.string().optional(),
  code: z.string().min(2, "Course code must be at least 2 characters."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  section: z.string().optional().default(""),
  subject: z.string().min(1, "Subject is required."),
  room: z.string().optional().default(""),
  description: z.string().optional().default(""),
  instructorId: z.string().optional().default(""),
  programId: z.string().max(200).optional(),
  instituteCode: z.string(),
});

export async function adminCreateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/admin/courses/actions.ts#adminCreateCourse", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('courseId') ?? '') }));

  const actor = await ensureAdmin();

  const parse = adminCourseSchema.safeParse({
    termId: formData.get('termId') || undefined,
    code: formData.get("code"),
    title: formData.get("title"),
    section: formData.get("section") || "",
    subject: formData.get("subject"),
    room: formData.get("room") || "",
    description: formData.get("description") || "",
    instructorId: formData.get("instructorId") || "",
    programId: formData.has("programId") ? formData.get("programId") : undefined,
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
    await administratorInstitute(actor, data.instituteCode);
    if (data.instructorId) await administratorInstructor(actor, data.instructorId);

    // Use the Agentic Skill to generate a unique course code
    const codeResult = await generateCourseCode();
    if (!codeResult.success || !codeResult.data) {
      return { message: "Failed to generate course code." };
    }

    const course = await db.$transaction(async tx => {
      const offering = await courseOffering(tx, { instituteId: institute.id, termId: data.termId, code: data.code, section: data.section });
      await validateCourseProgram(tx, institute.id, data.programId || null);
      const created = await tx.course.create({
        data: {
          ...offering,
          courseCode: codeResult.data,
          title: data.title,
          subject: data.subject,
          room: data.room,
          description: data.description,
          instructorId: data.instructorId || null,
          instituteId: institute.id,
        },
      });
      if (data.programId) await setCourseProgram(tx, created.id, data.programId);
      return created;
    });

    // If instructor was specified, use the bulk assign skill for validation
    if (data.instructorId) {
      await bulkAssignInstructor({
        assignments: [{ courseId: course.id, instructorId: data.instructorId }],
        instituteId: institute.id,
      });
    }

    revalidatePath(`/${data.instituteCode}/admin/courses`);
    revalidatePath(`/${data.instituteCode}/organization`, "layout");
    return { message: "success" };
  } catch (error) {
    console.error("adminCreateCourse error:", error);
    return { message: error instanceof AccessError ? error.message : "Failed to create course." };
  }
}

export async function adminUpdateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/admin/courses/actions.ts#adminUpdateCourse", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('id') ?? '') }));

  const actor = await ensureAdmin();

  const parse = adminCourseSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    title: formData.get("title"),
    section: formData.get("section") || "",
    subject: formData.get("subject"),
    room: formData.get("room") || "",
    description: formData.get("description") || "",
    instructorId: formData.get("instructorId") || "",
    programId: formData.has("programId") ? formData.get("programId") : undefined,
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
    await administratorInstitute(actor, data.instituteCode);
    if (data.instructorId) await administratorInstructor(actor, data.instructorId);

    // Multi-tenancy check
    const existing = await db.course.findUnique({
      where: { id: data.id },
    });
    if (!existing || existing.instituteId !== institute.id) {
      return { message: "Course not found or unauthorized." };
    }

    await db.$transaction(async tx => {
      if (data.programId !== undefined && (data.programId || null) !== existing.programId) {
        await validateCourseProgram(tx, institute.id, data.programId || null);
        await setCourseProgram(tx, data.id!, data.programId || null);
      }
      await tx.course.update({
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
    });

    revalidatePath(`/${data.instituteCode}/admin/courses`);
    revalidatePath(`/${data.instituteCode}/organization`, "layout");
    return { message: "success" };
  } catch (error) {
    console.error("adminUpdateCourse error:", error);
    return { message: error instanceof AccessError ? error.message : "Failed to update course." };
  }
}

export async function adminDeleteCourse(
  courseId: string,
  instituteCode: string
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/admin/courses/actions.ts#adminDeleteCourse", () => ({ institute: instituteCode, courseId }));

  const actor = await ensureAdmin();

  try {
    const institute = await db.institute.findUnique({
      where: { code: instituteCode },
    });
    await administratorInstitute(actor, instituteCode);
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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/admin/courses/actions.ts#getInstructors", () => ({ institute: instituteCode }));

  const institute = await db.institute.findUnique({
    where: { code: instituteCode },
  });
  const actor = await ensureAdmin();
  await administratorInstitute(actor, instituteCode);
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

// This control changes only the mapping, preserving instructor and enrollments.
export async function adminSetCourseProgram(
  prevState: { message: string }, formData: FormData
) {
  const actor = await requireLegacyActor("adminSetCourseProgram", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('id') ?? '') }));
  const parsed = z.object({ id: z.string().min(1).max(200), programId: z.string().max(200), instituteCode: z.string() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Choose a class and program." };
  const data = parsed.data;
  try {
    const institute = await administratorInstitute(actor, data.instituteCode);
    await db.$transaction(async tx => {
      await validateCourseProgram(tx, institute.id, data.programId || null);
      await setCourseProgram(tx, data.id, data.programId || null);
    });
    revalidatePath(`/${institute.code}/admin/courses`);
    revalidatePath(`/${institute.code}/organization`, "layout");
    return { message: "Program saved." };
  } catch (error) {
    return { message: error instanceof AccessError ? error.message : "Could not save the program. Try again." };
  }
}
