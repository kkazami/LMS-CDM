/**
 * Single source of truth for determining whether a user or route
 * is eligible for the Quiz Arena feature.
 *
 * RULE: Gated to the Institute of Business and Entrepreneurship (IBE).
 */

import { db } from "./db";
import { getSession } from "./auth-session";
import { normalizeRole } from "./admin-types";

export const ELIGIBLE_ARENA_INSTITUTE_CODE = "ibe";

export function isEligibleArenaInstituteCode(code?: string | null): boolean {
  if (!code || typeof code !== "string") return false;
  return code.toLowerCase() === ELIGIBLE_ARENA_INSTITUTE_CODE;
}

export async function isUserEligibleForArena(session: {
  user?: { id?: string; role?: string; instituteId?: string };
}): Promise<boolean> {
  if (!session?.user?.instituteId) return false;

  const institute = await db.institute.findUnique({
    where: { id: session.user.instituteId },
    select: { code: true },
  });

  return institute ? isEligibleArenaInstituteCode(institute.code) : false;
}

export async function checkArenaEligibility() {
  const session = await getSession();
  if (!session?.user) return null;

  const role = normalizeRole(session.user.role as string);
  const eligible = await isUserEligibleForArena({
    user: {
      id: session.user.id,
      role: session.user.role as string,
      instituteId: session.user.instituteId as string,
    },
  });

  return { eligible, session, role };
}
