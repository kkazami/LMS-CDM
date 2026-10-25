/**
 * Pure eligibility predicate for the Financial Statement Generator.
 * Zero external dependencies (safe for Node unit tests, edge middleware, layout).
 */

export const FINANCIAL_INSTITUTE_CODE = "ibe";

export function isFinancialEligible(user: {
  role?: string | null;
  institute?: { code?: string | null } | null;
}): boolean {
  const role = (user.role ?? "").toUpperCase();
  const institute = (user.institute?.code ?? "").toLowerCase();
  return role === "STUDENT" && institute === FINANCIAL_INSTITUTE_CODE;
}
