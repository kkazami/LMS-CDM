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
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
    const normalizeLocal = (h: string) => h.replace(/^127\.0\.0\.1(?=:|$)/, "localhost");
    if (host && normalizeLocal(originHost) === normalizeLocal(host)) return null;
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

let financialTableVerified = false;

export async function ensureFinancialStatementTable(): Promise<void> {
  if (financialTableVerified) return;
  try {
    await db.financialStatement.count({ take: 1 });
    financialTableVerified = true;
    return;
  } catch {
    // Table may not exist yet on Vercel if migrations weren't run manually
  }
  const statements = [
    `CREATE TABLE IF NOT EXISTS "FinancialStatement" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "instituteId" TEXT NOT NULL,
      "statementType" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "businessName" TEXT NOT NULL DEFAULT '',
      "periodStart" DATE,
      "periodEnd" DATE,
      "data" JSONB NOT NULL,
      "results" JSONB,
      "generatedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FinancialStatement_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "FinancialStatement_studentId_status_idx" ON "FinancialStatement"("studentId", "status")`,
    `CREATE INDEX IF NOT EXISTS "FinancialStatement_studentId_updatedAt_idx" ON "FinancialStatement"("studentId", "updatedAt")`,
    `CREATE INDEX IF NOT EXISTS "FinancialStatement_instituteId_idx" ON "FinancialStatement"("instituteId")`,
    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinancialStatement_studentId_fkey') THEN
        ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_studentId_fkey"
          FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinancialStatement_instituteId_fkey') THEN
        ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_instituteId_fkey"
          FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,
  ];
  for (const sql of statements) {
    await db.$executeRawUnsafe(sql);
  }
  financialTableVerified = true;
}
