/**
 * apps/web/src/lib/ite/guidance/guard.ts
 *
 * Server-side authorization guard for ITE AI-assisted guidance and suggestions.
 * Strictly limited to ITE students with APPROVED enrollments.
 */

import { db } from "@/lib/db";
import { requireIteUser } from "@/lib/ite/ite-eligibility";
import { HttpError } from "@/lib/practicum/http";

export interface GuidanceActor {
  userId: string;
  instituteId: string;
  instituteCode: string;
  name: string;
}

/**
 * Pure policy decision helper for guidance access.
 */
export function evaluateGuidanceAccess(input: {
  institute?: string | null;
  userRole?: string | null;
  isSuperUser?: boolean;
}): { allowed: boolean; statusCode: number; reason?: string } {
  if (input.isSuperUser) {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Super users are excluded from student guidance.",
    };
  }

  const code = (input.institute || "").toLowerCase().trim();
  if (code !== "ite") {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Guidance is only available to the ITE institute.",
    };
  }

  const role = (input.userRole || "").toUpperCase().trim();
  if (role !== "STUDENT") {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Guidance is strictly available to students only.",
    };
  }

  return { allowed: true, statusCode: 200 };
}

/**
 * Validates that the request comes from an authenticated ITE student.
 * Rejects INSTRUCTOR, PROFESSOR, TEACHER, ADMIN, SUPER_USER, and non-ITE users with 403.
 */
export async function requireGuidanceStudentActor(request: Request): Promise<GuidanceActor> {
  const result = await requireIteUser(request);

  if (!result.eligible) {
    throw new HttpError(403, "Guidance is only available to ITE users.");
  }

  if (result.role !== "STUDENT") {
    throw new HttpError(403, "Guidance is only available to students.");
  }

  const sessionUser = result.session.user as { instituteId?: string; name?: string };

  return {
    userId: result.userId,
    instituteId: sessionUser.instituteId || "",
    instituteCode: result.instituteCode,
    name: sessionUser.name || "Student",
  };
}

export interface VerifiedMaterialContext {
  materialId: string;
  courseId: string;
  title: string;
  description: string;
  attachments: Array<{
    fileName: string;
    type: string;
    url: string;
  }>;
}

/**
 * Verifies that the material belongs to an active ITE course where the student has an APPROVED enrollment.
 * Throws 404 (or 403) without revealing whether materials in other courses exist.
 */
export async function assertMaterialAccess(
  studentId: string,
  materialId: string
): Promise<VerifiedMaterialContext> {
  const material = await db.syllabusItem.findUnique({
    where: { id: materialId },
    include: {
      course: {
        include: {
          institute: { select: { code: true } },
          enrollments: {
            where: { studentId, status: "APPROVED" },
            select: { id: true },
          },
        },
      },
      attachments: {
        select: { fileName: true, type: true, url: true },
      },
    },
  });

  if (
    !material ||
    material.type !== "MATERIAL" ||
    material.course.institute.code.toLowerCase() !== "ite" ||
    material.course.enrollments.length === 0
  ) {
    throw new HttpError(404, "Learning material not found.");
  }

  return {
    materialId: material.id,
    courseId: material.courseId,
    title: material.title,
    description: material.description,
    attachments: material.attachments,
  };
}
