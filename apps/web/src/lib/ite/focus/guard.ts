/**
 * apps/web/src/lib/ite/focus/guard.ts
 *
 * Strict access control for ITE Focus Mode.
 * Only ITE Students are allowed. All other roles (ADMIN, PROFESSOR, INSTRUCTOR,
 * SUPER_USER, etc.) and non-ITE institutes are rejected with 403 / notFound.
 */

import { notFound, redirect } from "next/navigation";
import { checkIteEligibility, isIteInstituteCode, requireIteUser } from "@/lib/ite/ite-eligibility";
import { HttpError } from "@/lib/practicum/http";
import type { FocusActor } from "./types";

/**
 * Pure policy decision helper for Focus Mode access.
 */
export function evaluateFocusAccess(input: {
  institute?: string | null;
  userRole?: string | null;
  isSuperUser?: boolean;
}): { allowed: boolean; statusCode: number; reason?: string } {
  if (input.isSuperUser) {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Super users are excluded from student Focus Mode.",
    };
  }

  const code = (input.institute || "").toLowerCase().trim();
  if (code !== "ite") {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Focus Mode is only available to the ITE institute.",
    };
  }

  const role = (input.userRole || "").toUpperCase().trim();
  if (role !== "STUDENT") {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Focus Mode is strictly available to students only.",
    };
  }

  return { allowed: true, statusCode: 200 };
}

/**
 * Validates an API request:
 * 1. Must be authenticated (throws 401 if not).
 * 2. Must belong to the ITE institute (throws 403 if not).
 * 3. Role must be strictly "STUDENT" (throws 403 for INSTRUCTOR, ADMIN, SUPER_USER, etc.).
 */
export async function requireFocusStudentActor(request: Request): Promise<FocusActor> {
  const result = await requireIteUser(request);

  if (!result.eligible) {
    throw new HttpError(403, "Focus Mode is only available to ITE users.");
  }

  // Canonical role check: only STUDENT is allowed
  if (result.role !== "STUDENT") {
    throw new HttpError(403, "Focus Mode is only available to students.");
  }

  const sessionUser = result.session.user as { instituteId?: string; name?: string };

  return {
    userId: result.userId,
    role: "STUDENT",
    instituteId: sessionUser.instituteId || "",
    instituteCode: result.instituteCode,
    name: sessionUser.name || "Student",
  };
}

/**
 * Page-level guard for server components.
 * Redirects unauthenticated to login; returns 404 for non-ITE or non-student users.
 */
export async function requireFocusStudentPageActor(institute: string): Promise<FocusActor> {
  const result = await checkIteEligibility();

  if (!result) {
    redirect(`/login?institute=${institute}`);
  }

  if (!result.eligible || !isIteInstituteCode(institute)) {
    notFound();
  }

  if (result.role !== "STUDENT") {
    notFound();
  }

  const sessionUser = result.session.user as { instituteId?: string; name?: string };

  return {
    userId: result.userId,
    role: "STUDENT",
    instituteId: sessionUser.instituteId || "",
    instituteCode: result.instituteCode,
    name: sessionUser.name || "Student",
  };
}
