/**
 * Server and client eligibility helper for the IBE Hall of Fame.
 * Strictly restricted to active IBE students.
 */

export const HALL_OF_FAME_INSTITUTE_CODE = "ibe";

export interface HallOfFameEligibilitySubject {
  role?: string | null;
  institute?: { code?: string | null } | null;
  instituteCode?: string | null;
  isActive?: boolean | null;
  activationStatus?: string | null;
  isSuperUser?: boolean | null;
}

export function isHallOfFameEligible(
  user: HallOfFameEligibilitySubject | null | undefined
): boolean {
  if (!user) return false;
  if (user.isSuperUser) return false;
  if (user.isActive === false) return false;
  if (user.activationStatus && user.activationStatus !== "ACTIVE") return false;

  const role = (user.role ?? "").trim().toUpperCase();
  const instituteCode = (user.institute?.code ?? user.instituteCode ?? "")
    .trim()
    .toLowerCase();

  return role === "STUDENT" && instituteCode === HALL_OF_FAME_INSTITUTE_CODE;
}

