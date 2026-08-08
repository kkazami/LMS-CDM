"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { generateCourseCode, bulkAssignInstructor } from "@/lib/skills";

const instructorCreateCourseSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(2, "Code must be at least 2 characters."),
  title: z.string().min(3, "Title must be at least 3 characters."),
  section: z.string().optional().default(""),
  subject: z.string().min(1, "Subject is required."),
  room: z.string().optional().default(""),
  description: z.string().optional().default(""),
  instituteCode: z.string(),
});

export async function instructorCreateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  const user = await ensureRole(["PROFESSOR", "ADMIN"]);

  const parse = instructorCreateCourseSchema.safeParse({
    code: formData.get("code"),
    title: formData.get("title"),
    section: formData.get("section") || "",
    subject: formData.get("subject"),
    room: formData.get("room") || "",
    description: formData.get("description") || "",
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
        instructorId: user.id, // Automatically assign to the creator
        instituteId: institute.id,
      },
    });

    // Auto-assign the instructor using the skill logic as well to keep relations clean
    await bulkAssignInstructor({
      assignments: [{ courseId: course.id, instructorId: user.id }],
      instituteId: institute.id,
    });

    revalidatePath(`/(dashboard)/${data.instituteCode}/courses`);
    return { message: "success" };
  } catch (error) {
    console.error("instructorCreateCourse error:", error);
    return { message: "Failed to create course." };
  }
}

export async function instructorUpdateCourse(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
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

    await db.course.update({
      where: { id: data.id },
      data: {
        code: data.code,
        title: data.title,
        section: data.section,
        subject: data.subject,
        room: data.room,
        description: data.description,
      },
    });

    revalidatePath(`/(dashboard)/${data.instituteCode}/courses`);
    revalidatePath(`/(dashboard)/${data.instituteCode}/teachers`);
    return { message: "success" };
  } catch (error) {
    console.error("instructorUpdateCourse error:", error);
    return { message: "Failed to update course." };
  }
}

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

export async function createCourse(prevState: { message: string; errors?: Record<string, string[]> }, formData: FormData) {
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
        instituteId: institute.id,
      },
    });

    revalidatePath(`/${instituteCode}/courses`);
    return { message: "success" };
  } catch (error) {
    return { message: "Failed to create course." };
  }
}

export async function updateCourse(prevState: { message: string; errors?: Record<string, string[]> }, formData: FormData) {
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
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (session.user.role.toUpperCase() !== "STUDENT") {
    return { success: false, error: "Only students can request enrollment." };
  }

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
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  if (session.user.role.toUpperCase() !== "STUDENT") {
    return { success: false, error: "Only students can join courses." };
  }

  try {
    const course = await db.course.findUnique({
      where: { courseCode: courseCode.toUpperCase() },
      select: { id: true, instituteId: true },
    });

    if (!course) {
      return { success: false, error: "Invalid course code. Please check and try again." };
    }

    // Verify course belongs to the student's institute
    const institute = await db.institute.findUnique({
      where: { code: instituteCode },
    });

    if (!institute || course.instituteId !== institute.id) {
      return { success: false, error: "This course is not available at your institute." };
    }

    // Check existing enrollment
    const existing = await db.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: session.user.id,
        },
      },
    });

    if (existing) {
      if (existing.status === "APPROVED") {
        return { success: false, error: "You are already enrolled." };
      }
      if (existing.status === "PENDING") {
        return { success: false, error: "Your request is already pending." };
      }
    }

    await db.enrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: session.user.id,
        },
      },
      create: {
        courseId: course.id,
        studentId: session.user.id,
        status: "PENDING",
      },
      update: {
        status: "PENDING",
      },
    });

    revalidatePath(`/${instituteCode}/students`);
    revalidatePath(`/${instituteCode}/courses`);
    return { success: true };
  } catch (error) {
    console.error("joinWithCode error:", error);
    return { success: false, error: "Failed to join course." };
  }
}

export async function getDiscoverableCourses(instituteCode: string) {
  const session = await getSession();
  if (!session) return [];

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
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can customize course cards." };
  }

  try {
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

