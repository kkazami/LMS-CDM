import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../api-auth";
import { db } from "../db";
import { STATEMENT_ID } from "./server";

/**
 * Authorization for every Financial Statement Generator page action and API
 * handler. The feature is IBE-student only: the session must belong to an
 * ACTIVE user whose role is exactly STUDENT and whose institute is IBE.
 *
 * NB: `normalizeRole()` maps unknown roles to STUDENT, so it must not be used
 * here — the role string is compared strictly.
 */

import { isFinancialEligible, FINANCIAL_INSTITUTE_CODE } from "./eligibility";

export { isFinancialEligible, FINANCIAL_INSTITUTE_CODE };

export type StudentAccess =
  | { ok: true; userId: string; instituteId: string; name: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireFinancialStudent(request?: Request): Promise<StudentAccess> {
  const session = await getSessionFromRequest(request);
  if (!session?.user) return { ok: false, status: 401, message: "Unauthorized" };
  const user = session.user;
  if (!isFinancialEligible(user)) {
    return { ok: false, status: 403, message: "The Financial Statement Generator is available to IBE students only." };
  }
  return { ok: true, userId: user.id, instituteId: user.instituteId, name: user.name };
}

/** Same-origin guard for state-changing requests (defense in depth with cookie auth). */
export function sameOriginViolation(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* fall through */
  }
  return NextResponse.json({ message: "Cross-origin request blocked." }, { status: 403 });
}

export function denied(access: Extract<StudentAccess, { ok: false }>): NextResponse {
  return NextResponse.json({ message: access.message }, { status: access.status });
}

/** Loads a statement only if it belongs to the student; otherwise behaves as not-found (no existence leak). */
export async function loadOwnedStatement(id: string, studentId: string) {
  if (!STATEMENT_ID.test(id)) return null;
  return db.financialStatement.findFirst({ where: { id, studentId } });
}
