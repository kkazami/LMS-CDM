"use server";
import { enrollWithClassCode } from '@/lib/student-enrollment';
import { persistentLimit } from '@/lib/roster/rate-limit';
import { requireOwnedUpload } from '@/lib/private-upload';
import { requireCourseAccess } from '@/lib/course-access';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';


import { z } from "zod";
import { AccessError } from "@/lib/super-user-v1/actor";
import { canonicalRole } from "@/lib/super-user-v1/capabilities";
import { validateCourseProgram, setCourseProgram } from "@/lib/course-program";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { classScheduleSchema } from "@/lib/calendar-validation";
import { normalizeRole } from "@/lib/rbac";
import { generateCourseCode, bulkAssignInstructor } from "@/lib/skills";
import { courseOffering, joinCode } from '@/lib/roster/terms';

const instructorCreateCourseSchema = z.object({
  termId: z.string().optional(),
  id: z.string().optional(),
  code: z.string().min(2, "Code must be at least 2 characters."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  section: z.string().optional().default(""),
  subject: z.string().min(1, "Subject is required."),
  room: z.string().optional().default(""),
  description: z.string().optional().default(""),
  instituteCode: z.string(),
  programId: z.string().max(200).optional(),
}).and(classScheduleSchema);

export async function instructorCreateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#instructorCreateCourse", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('courseId') ?? '') }));

  const user = await ensureRole(["PROFESSOR", "ADMIN"]);

  const parse = instructorCreateCourseSchema.safeParse({
    termId: formData.get('termId') || undefined,
    code: formData.get("code"),
    title: formData.get("title"),
    section: formData.get("section") || "",
    subject: formData.get("subject"),
    room: formData.get("room") || "",
    description: formData.get("description") || "",
    instituteCode: formData.get("instituteCode"),
    programId: formData.has("programId") ? formData.get("programId") : undefined,
    scheduleDays: formData.getAll("scheduleDays").map(Number),
    scheduleStart: formData.get("scheduleStart"),
    scheduleEnd: formData.get("scheduleEnd"),
    scheduleStartDate: formData.get("scheduleStartDate"),
    scheduleEndDate: formData.get("scheduleEndDate"),
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
    if (!institute || institute.id !== user.instituteId) return { message: "Institute not found." };

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
          scheduleDays: [...new Set(data.scheduleDays)],
          scheduleStart: data.scheduleStart,
          scheduleEnd: data.scheduleEnd,
          scheduleStartDate: new Date(`${data.scheduleStartDate}T00:00:00Z`),
          scheduleEndDate: new Date(`${data.scheduleEndDate}T00:00:00Z`),
          description: data.description,
          instructorId: user.id, // Automatically assign to the creator
          instituteId: institute.id,
        },
      });
      if (data.programId) await setCourseProgram(tx, created.id, data.programId);
      return created;
    });

    // Auto-assign the instructor using the skill logic as well to keep relations clean
    await bulkAssignInstructor({
      assignments: [{ courseId: course.id, instructorId: user.id }],
      instituteId: institute.id,
    });

    revalidatePath(`/${data.instituteCode}/courses`);
    revalidatePath(`/${data.instituteCode}/students`);
    revalidatePath(`/${data.instituteCode}/teachers`);
    revalidatePath(`/${data.instituteCode}/admin/courses`);
    revalidatePath(`/${data.instituteCode}/organization`, "layout");
    return { message: "success" };
  } catch (error) {
    console.error("instructorCreateCourse error:", error);
    return { message: error instanceof AccessError ? error.message : "Failed to create course." };
  }
}

export async function instructorUpdateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#instructorUpdateCourse", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('id') ?? '') }));

  const user = await ensureRole(["PROFESSOR", "ADMIN"]);

  const parse = instructorCreateCourseSchema.safeParse({
    id: formData.get("id"),
    code: formData.get("code"),
    title: formData.get("title"),
    section: formData.get("section") || "",
    subject: formData.get("subject"),
    room: formData.get("room") || "",
    description: formData.get("description") || "",
    instituteCode: formData.get("instituteCode"),
    programId: formData.has("programId") ? formData.get("programId") : undefined,
    scheduleDays: formData.getAll("scheduleDays").map(Number),
    scheduleStart: formData.get("scheduleStart"),
    scheduleEnd: formData.get("scheduleEnd"),
    scheduleStartDate: formData.get("scheduleStartDate"),
    scheduleEndDate: formData.get("scheduleEndDate"),
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
    if (!institute || institute.id !== user.instituteId) return { message: "Institute not found." };

    // Verify ownership or admin
    const existingCourse = await db.course.findUnique({
      where: { id: data.id },
    });

    if (!existingCourse || existingCourse.instituteId !== institute.id) {
      return { message: "Course not found or unauthorized for this institute." };
    }

    if (user.role !== "ADMIN" && existingCourse.instructorId !== user.id) {
      return { message: "Unauthorized to edit this course." };
    }

    await db.$transaction(async tx => {
      if (data.programId !== undefined && (data.programId || null) !== existingCourse.programId) {
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
          scheduleDays: [...new Set(data.scheduleDays)],
          scheduleStart: data.scheduleStart,
          scheduleEnd: data.scheduleEnd,
          scheduleStartDate: new Date(`${data.scheduleStartDate}T00:00:00Z`),
          scheduleEndDate: new Date(`${data.scheduleEndDate}T00:00:00Z`),
          description: data.description,
        },
      });
    });

    revalidatePath(`/${data.instituteCode}/courses`);
    revalidatePath(`/${data.instituteCode}/students`);
    revalidatePath(`/${data.instituteCode}/teachers`);
    revalidatePath(`/${data.instituteCode}/admin/courses`);
    revalidatePath(`/${data.instituteCode}/organization`, "layout");
    return { message: "success" };
  } catch (error) {
    console.error("instructorUpdateCourse error:", error);
    return { message: error instanceof AccessError ? error.message : "Failed to update course." };
  }
}

export async function getClassPrograms(instituteCode: string, courseId?: string) {
  const actor = await requireLegacyActor("getClassPrograms", { institute: instituteCode, courseId });
  if (!['ADMIN', 'INSTRUCTOR'].includes(canonicalRole(actor.role))) throw new AccessError(403, "Instructors and administrators only.");
  const institute = await db.institute.findFirst({ where: { id: actor.instituteId, code: instituteCode } });
  if (!institute) throw new AccessError(403, "Forbidden institute.");
  const course = courseId ? await db.course.findFirst({
    where: { id: courseId, instituteId: institute.id, ...(canonicalRole(actor.role) === 'ADMIN' ? {} : { instructorId: actor.id }) },
    select: { programId: true, program: { select: { id: true, code: true, name: true } } },
  }) : null;
  if (courseId && !course) throw new AccessError(404, "Class not found.");
  const programs = await db.academicProgram.findMany({ where: { instituteId: institute.id, isActive: true }, select: { id: true, code: true, name: true }, orderBy: { code: 'asc' } });
  return { programs, currentProgram: course?.program ?? null };
}

async function ensureRole(allowedRoles: string[]) {
  const session = await getSession();
  if (!session || !session.user || !allowedRoles.map(normalizeRole).includes(normalizeRole(session.user.role))) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

const courseSchema = z.object({
  termId: z.string().optional(),
  subject: z.string().optional(),
  section: z.string().optional(),
  id: z.string().optional(),
  code: z.string().min(2, "Code must be at least 2 characters."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  instituteCode: z.string(),
});

export async function createCourse(prevState: { message: string; errors?: Record<string, string[]> }, formData: FormData) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#createCourse", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('courseId') ?? '') }));

  const user = await ensureRole(["ADMIN", "PROFESSOR"]);

  const parse = courseSchema.safeParse({
    termId: formData.get('termId') || undefined,
    subject: formData.get('subject') || '',
    section: formData.get('section') || '',
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
    if (!institute || institute.id !== user.instituteId) return { message: "Institute not found." };
    if (!parse.data.subject?.trim()) return { message: 'Subject is required.' };
    await db.$transaction(async tx => {
      const offering = await courseOffering(tx, { instituteId: institute.id, termId: parse.data.termId, code, section: parse.data.section });
      await tx.course.create({ data: { ...offering, title, subject: parse.data.subject!.trim(), instituteId: institute.id, courseCode: await joinCode(tx), instructorId: canonicalRole(user.role) === 'INSTRUCTOR' ? user.id : null } });
    });

    revalidatePath(`/${instituteCode}/courses`);
    return { message: "success" };
  } catch (error) {
    return { message: "Failed to create course." };
  }
}

export async function updateCourse(prevState: { message: string; errors?: Record<string, string[]> }, formData: FormData) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#updateCourse", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('id') ?? '') }));

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

    revalidatePath(`/${instituteCode}/courses`);
    return { message: "success" };
  } catch (error) {
    return { message: "Failed to update course." };
  }
}

export async function deleteCourse(courseId: string, instituteCode: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#deleteCourse", () => ({ institute: instituteCode, courseId }));

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
    revalidatePath(`/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete course." };
  }
}

// ─── Student Enrollment Actions ───

export async function requestEnrollment(courseId: string, instituteCode: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#requestEnrollment", () => ({ institute: instituteCode, courseId }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (session.user.role.toUpperCase() !== "STUDENT") {
    return { success: false, error: "Only students can request enrollment." };
  }

  if (session.user.institute.code !== instituteCode.toLowerCase()) return { success: false, error: "Forbidden institute." };
  const target = await db.course.findUnique({ where: { id: courseId }, select: { instituteId: true, isArchived: true } });
  if (!target || target.isArchived || target.instituteId !== session.user.instituteId) return { success: false, error: "This class is not available at your institute." };

  try {
    // Check if already enrolled or requested
    const existing = await db.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId: session.user.id,
        },
      },
    });

    if (existing) {
      if (existing.status === "APPROVED") {
        return { success: false, error: "You are already enrolled in this course." };
      }
      if (existing.status === "PENDING") {
        return { success: false, error: "Your enrollment request is already pending." };
      }
      if (existing.status === "DECLINED") {
        // Allow re-request if previously declined
        await db.enrollment.update({
          where: { id: existing.id },
          data: { status: "PENDING" },
        });
        revalidatePath(`/${instituteCode}/courses`);
        return { success: true };
      }
    }

    await db.enrollment.create({
      data: {
        courseId,
        studentId: session.user.id,
        status: "PENDING",
      },
    });

    revalidatePath(`/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    console.error("requestEnrollment error:", error);
    return { success: false, error: "Failed to submit enrollment request." };
  }
}

export async function joinWithCode(courseCode: string, instituteCode: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#joinWithCode", () => ({ institute: instituteCode }));
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (session.user.institute.code !== instituteCode.toLowerCase()) return { success: false, error: "This class is not available at your institute." };
  try {
    await persistentLimit('join-class:' + session.userId, 10, 15 * 60 * 1000);
    await enrollWithClassCode(session, courseCode);
    revalidatePath(`/${instituteCode}/students`);
    revalidatePath(`/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof AccessError ? error.message : "Unable to join this class." };
  }
}

export async function getDiscoverableCourses(instituteCode: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#getDiscoverableCourses", () => ({ institute: instituteCode }));

  const session = await getSession();
  if (!session) return [];
  if (session.user.institute.code !== instituteCode.toLowerCase()) return [];

  const institute = await db.institute.findUnique({
    where: { code: instituteCode },
  });

  if (!institute) return [];

  // Get all courses at this institute that the student is NOT enrolled in
  const enrolledCourseIds = (
    await db.enrollment.findMany({
      where: { studentId: session.user.id },
      select: { courseId: true },
    })
  ).map((e) => e.courseId);

  return db.course.findMany({
    where: {
      instituteId: institute.id,
      id: { notIn: enrolledCourseIds },
    },
    include: {
      instructor: { select: { name: true } },
      _count: {
        select: { enrollments: { where: { status: "APPROVED" } } },
      },
    },
    orderBy: { title: "asc" },
  });
}

// ─── Phase 7: Dashboard Lifecycle Actions ───

export async function unenrollFromCourse(courseId: string, instituteCode: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#unenrollFromCourse", () => ({ institute: instituteCode, courseId }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "STUDENT") return { success: false, error: "Only students can unenroll." };

  try {
    await db.enrollment.delete({
      where: {
        courseId_studentId: { courseId, studentId: session.user.id },
      },
    });

    // Clean up dashboard layout if it exists
    await db.dashboardLayout.deleteMany({
      where: { userId: session.user.id, courseId },
    });

    revalidatePath(`/${instituteCode}/students`);
    revalidatePath(`/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    console.error("unenrollFromCourse error:", error);
    return { success: false, error: "Failed to unenroll." };
  }
}

export async function archiveCourse(courseId: string, instituteCode: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#archiveCourse", () => ({ institute: instituteCode, courseId }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can archive courses." };
  }

  try {
    await db.course.update({ where: { id: courseId }, data: { isArchived: true } });
    revalidatePath(`/${instituteCode}/teachers`);
    revalidatePath(`/${instituteCode}/courses`);
    revalidatePath(`/${instituteCode}/courses/archived`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to archive course." };
  }
}

export async function unarchiveCourse(courseId: string, instituteCode: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#unarchiveCourse", () => ({ institute: instituteCode, courseId }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can unarchive courses." };
  }

  try {
    await db.course.update({ where: { id: courseId }, data: { isArchived: false } });
    revalidatePath(`/${instituteCode}/courses`);
    revalidatePath(`/${instituteCode}/courses/archived`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to unarchive course." };
  }
}

export async function reorderCourseCards(
  orderedIds: string[],
  instituteCode: string,
  isStudent: boolean
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#reorderCourseCards", () => ({ institute: instituteCode, courseIds: orderedIds }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  try {
    if (isStudent) {
      // For students: update Enrollment.displayOrderIndex
      await Promise.all(
        orderedIds.map((courseId, index) =>
          db.enrollment.updateMany({
            where: { courseId, studentId: session.user.id },
            data: { displayOrderIndex: index },
          })
        )
      );
    } else {
      // For instructors/admins: update DashboardLayout
      await Promise.all(
        orderedIds.map(async (courseId, index) => {
          await db.dashboardLayout.upsert({
            where: { userId_courseId: { userId: session.user.id, courseId } },
            create: { userId: session.user.id, courseId, displayOrderIndex: index },
            update: { displayOrderIndex: index },
          });
        })
      );
    }

    revalidatePath(`/${instituteCode}/students`);
    revalidatePath(`/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    console.error("reorderCourseCards error:", error);
    return { success: false, error: "Failed to reorder." };
  }
}

export async function updateCourseCoverImage(
  courseId: string,
  coverImage: string,
  instituteCode: string
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/actions.ts#updateCourseCoverImage", () => ({ institute: instituteCode, courseId }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can customize course cards." };
  }

  try {
    await requireCourseAccess(session.user, courseId, true);
    await requireOwnedUpload(db, session.user, coverImage);
    await db.course.update({
      where: { id: courseId },
      data: { coverImage },
    });

    revalidatePath(`/${instituteCode}/teachers`);
    revalidatePath(`/${instituteCode}/students`);
    revalidatePath(`/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    console.error("updateCourseCoverImage error:", error);
    return { success: false, error: "Failed to update course cover image." };
  }
}


export async function getCourseTerms(instituteCode: string) {
  const actor = await requireLegacyActor('getCourseTerms', { institute: instituteCode });
  if (!['ADMIN', 'INSTRUCTOR'].includes(canonicalRole(actor.role))) throw new AccessError(403, 'Instructors and administrators only.');
  const institute = await db.institute.findFirst({ where: { id: actor.instituteId, code: instituteCode } });
  if (!institute) throw new AccessError(403, 'Forbidden institute.');
  return db.academicTerm.findMany({ where: { instituteId: institute.id, isActive: true }, select: { id: true, name: true, isCurrent: true }, orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }] });
}
