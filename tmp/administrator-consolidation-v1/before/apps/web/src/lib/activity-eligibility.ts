/**
 * Activity Eligibility Guard
 *
 * Single source of truth for determining whether a user can access
 * the Interactive Activities feature suite (3D simulations, CodeLab).
 *
 * RULE: Only users belonging to the Institute of Computer Studies (ICS)
 * are eligible. ICS exclusively houses BSIT and BSCpE programs at CDM.
 *
 * If a Program model is added to the schema in the future, refine the
 * check here — every consumer imports from this module, so the change
 * propagates automatically.
 *
 * Used by:
 *   - Route layout: apps/web/src/app/(dashboard)/[institute]/activities/layout.tsx
 *   - API routes:   apps/web/src/app/api/activities/submit/route.ts
 *   - Sidebar:      apps/web/src/components/layout/Sidebar.tsx (conditional nav entry)
 */

import { db } from "./db";
import { getSession } from "./auth-session";
import { normalizeRole } from "./admin-types";

/** The institute code that gates access to Interactive Activities. */
const ELIGIBLE_INSTITUTE_CODE = "ics";

/**
 * Minimal session shape needed for eligibility checks.
 * Avoids coupling to the full Prisma Session type.
 */
interface EligibilitySession {
  user: {
    id: string;
    role: string;
    instituteId: string;
  };
}

/**
 * Checks if a user session is eligible for Interactive Activities.
 *
 * Eligible when:
 *   - The user's institute code is "ics" (Institute of Computer Studies)
 *   - Students: must be enrolled under ICS
 *   - Instructors: must belong to ICS (they teach ICS courses by definition,
 *     since Course.instituteId matches the instructor's institute)
 *   - Admins at ICS: eligible (can manage activities)
 *
 * @param session - A session object containing at least user.id, user.role, user.instituteId
 * @returns true if the user may access activity features
 */
export async function isEligibleForActivities(
  session: EligibilitySession
): Promise<boolean> {
  // Look up the institute to get its code
  const institute = await db.institute.findUnique({
    where: { id: session.user.instituteId },
    select: { code: true },
  });

  if (!institute) return false;

  return institute.code.toLowerCase() === ELIGIBLE_INSTITUTE_CODE;
}

/**
 * Synchronous eligibility check when institute code is already known.
 * Useful in client components where the institute code comes from the route param.
 *
 * @param instituteCode - The institute code from the URL (e.g. "ics", "ibe")
 * @returns true if this institute code qualifies for activity features
 */
export function isEligibleInstituteCode(instituteCode: string): boolean {
  return instituteCode.toLowerCase() === ELIGIBLE_INSTITUTE_CODE;
}

/**
 * Full eligibility check for API route handlers.
 * Reads the session from the cookie, validates it, and checks eligibility.
 *
 * @returns Object with eligibility result and session, or null if no valid session.
 * @throws Never — returns null on auth failure so callers can choose their own error shape.
 */
export async function checkActivityEligibility(): Promise<{
  eligible: boolean;
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
  role: ReturnType<typeof normalizeRole>;
} | null> {
  const session = await getSession();
  if (!session) return null;

  const role = normalizeRole(session.user.role as string);
  const eligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role as string,
      instituteId: session.user.instituteId as string,
    },
  });

  return { eligible, session, role };
}
