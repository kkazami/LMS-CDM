import { notFound, redirect } from "next/navigation";
import { checkIteEligibility, isIteInstituteCode, requireIteUser } from "@/lib/ite/ite-eligibility";
import { HttpError } from "./http";

/** The only two roles Practicum knows: ITE student (student teacher) and ITE instructor (supervisor). */
export type PracticumRole = "STUDENT" | "INSTRUCTOR";

export interface PracticumActor {
  userId: string;
  role: PracticumRole;
  instituteId: string;
  name: string;
}

function toActor(
  result: { userId: string; role: string; session: { user: { instituteId: string; name: string } } },
  allowed: readonly PracticumRole[]
): PracticumActor | null {
  // Admins are not part of Practicum; unknown roles never reach this point (normalizeRole).
  const role = result.role;
  if (role !== "STUDENT" && role !== "INSTRUCTOR") return null;
  if (!allowed.includes(role)) return null;
  return {
    userId: result.userId,
    role,
    instituteId: result.session.user.instituteId,
    name: result.session.user.name,
  };
}

/**
 * API guard. Authenticates (cookie or Bearer), requires the caller to belong to ITE via the
 * shared helper (401 / 403 thrown by requireIteUser), then requires one of the allowed roles.
 */
export async function requirePracticumActor(
  request: Request,
  allowed: readonly PracticumRole[]
): Promise<PracticumActor> {
  const result = await requireIteUser(request);
  const actor = toActor(result, allowed);
  if (!actor) throw new HttpError(403, "You do not have access to this Practicum feature.");
  return actor;
}

/**
 * Page guard. Unauthenticated users go to login; anyone outside ITE, on a non-ITE portal URL,
 * or with a role that Practicum does not use gets the app's not-found page.
 */
export async function requirePracticumPageActor(
  institute: string,
  allowed: readonly PracticumRole[]
): Promise<PracticumActor> {
  const result = await checkIteEligibility();
  if (!result) redirect(`/login?institute=${institute}`);
  if (!result.eligible || !isIteInstituteCode(institute)) notFound();

  const actor = toActor(result, allowed);
  if (!actor) notFound();
  return actor;
}
