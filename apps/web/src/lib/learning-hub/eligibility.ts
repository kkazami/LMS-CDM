/**
 * Server and client eligibility helper for the IBE Student Learning Hub.
 * Strictly restricted to active IBE students.
 */

export const LEARNING_HUB_INSTITUTE_CODE = "ibe";

export interface LearningHubEligibilitySubject {
  role?: string | null;
  institute?: { code?: string | null } | null;
  instituteCode?: string | null;
  isActive?: boolean | null;
  activationStatus?: string | null;
  isSuperUser?: boolean | null;
}

export function isLearningHubEligible(
  user: LearningHubEligibilitySubject | null | undefined
): boolean {
  if (!user) return false;
  if (user.isSuperUser) return false;
  if (user.isActive === false) return false;
  if (user.activationStatus && user.activationStatus !== "ACTIVE") return false;

  const role = (user.role ?? "").trim().toUpperCase();
  const instituteCode = (user.institute?.code ?? user.instituteCode ?? "")
    .trim()
    .toLowerCase();

  return role === "STUDENT" && instituteCode === LEARNING_HUB_INSTITUTE_CODE;
}