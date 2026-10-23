/**
 * apps/web/src/lib/ite/offline/guard.ts
 *
 * Strict access control for ITE Offline features.
 * Only authenticated ITE students are allowed.
 * Instructors, professors, admins, super users, and ICS/IBE users get 403.
 */

import { requireIteUser } from "@/lib/ite/ite-eligibility";
import { HttpError } from "@/lib/practicum/http";
import type { OfflineActor } from "./types";

/**
 * Pure policy decision helper for offline access.
 */
export function evaluateOfflineAccess(input: {
  institute?: string | null;
  userRole?: string | null;
  isSuperUser?: boolean;
}): { allowed: boolean; statusCode: number; reason?: string } {
  if (input.isSuperUser) {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Super users are excluded from student offline access.",
    };
  }

  const code = (input.institute || "").toLowerCase().trim();
  if (code !== "ite") {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Offline access is strictly reserved for the ITE institute.",
    };
  }

  const role = (input.userRole || "").toUpperCase().trim();
  if (role !== "STUDENT") {
    return {
      allowed: false,
      statusCode: 403,
      reason: "Offline access is strictly reserved for students.",
    };
  }

  return { allowed: true, statusCode: 200 };
}

/**
 * Validates an API request for ITE offline routes.
 * Throws HttpError(401) if not authenticated.
 * Throws HttpError(403) if not an eligible ITE student.
 */
export async function requireOfflineStudentActor(request: Request): Promise<OfflineActor> {
  const result = await requireIteUser(request);

  if (!result.eligible) {
    throw new HttpError(403, "Offline features are restricted to the ITE institute.");
  }

  if (result.role !== "STUDENT") {
    throw new HttpError(403, "Offline features are strictly for students.");
  }

  return {
    userId: result.userId,
    role: result.role,
    instituteCode: result.instituteCode,
  };
}
