/**
 * Pure eligibility predicate for the Mock Interview Feature.
 * Zero external dependencies (safe for Node unit tests, edge middleware, layout).
 */

export const MOCK_INTERVIEW_INSTITUTE_CODE = "ibe";

export function isMockInterviewEligible(user: {
  role?: string | null;
  institute?: { code?: string | null } | null;
}): boolean {
  const role = (user.role ?? "").toUpperCase();
  const institute = (user.institute?.code ?? "").toLowerCase();
  return role === "STUDENT" && institute === MOCK_INTERVIEW_INSTITUTE_CODE;
}
