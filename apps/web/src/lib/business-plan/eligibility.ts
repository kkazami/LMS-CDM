/**
 * Pure eligibility and same-origin predicates for the Business Plan Guide and Builder.
 * Zero external dependencies (safe for Node unit tests, edge middleware, layout).
 * Strictly accessible to authenticated IBE students only.
 */

export const BUSINESS_PLAN_INSTITUTE_CODE = "ibe";

export function isBusinessPlanEligible(
  user?: {
    role?: string | null;
    institute?: { code?: string | null } | null;
    instituteCode?: string | null;
    isActive?: boolean | null;
    activationStatus?: string | null;
  } | null
): boolean {
  if (!user) return false;
  if (user.isActive === false) return false;
  if (user.activationStatus && user.activationStatus !== "ACTIVE") return false;
  const role = (user.role ?? "").trim().toUpperCase();
  const institute = (user.institute?.code ?? user.instituteCode ?? "").trim().toLowerCase();
  return role === "STUDENT" && institute === BUSINESS_PLAN_INSTITUTE_CODE;
}

export function isSameOriginRequest(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return true;
    const normalizeLocal = (h: string) => h.replace(/^127\.0\.0\.1(?=:|$)/, "localhost");
    if (host && normalizeLocal(originHost) === normalizeLocal(host)) return true;
  } catch {
    /* fall through */
  }
  return false;
}
