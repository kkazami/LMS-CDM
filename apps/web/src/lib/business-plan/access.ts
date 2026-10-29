import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../api-auth";
import { db } from "../db";
import { isBusinessPlanEligible, BUSINESS_PLAN_INSTITUTE_CODE } from "./eligibility";
import {
  BUSINESS_PLAN_ID,
  toBusinessPlanRecord,
  toBusinessPlanSummary,
  type RawBusinessPlanRow,
} from "./validation";

export {
  isBusinessPlanEligible,
  BUSINESS_PLAN_INSTITUTE_CODE,
  BUSINESS_PLAN_ID,
  toBusinessPlanRecord,
  toBusinessPlanSummary,
  type RawBusinessPlanRow,
};

export type StudentAccess =
  | { ok: true; userId: string; instituteId: string; name: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireBusinessPlanStudent(request?: Request): Promise<StudentAccess> {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  const user = session.user;
  if (!isBusinessPlanEligible(user)) {
    return {
      ok: false,
      status: 403,
      message: "The Business Plan Guide and Builder is available to authenticated IBE students only.",
    };
  }
  return {
    ok: true,
    userId: user.id,
    instituteId: user.instituteId,
    name: user.name,
  };
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

let businessPlanTableVerified = false;

export async function ensureBusinessPlanTable(): Promise<void> {
  if (businessPlanTableVerified) return;
  try {
    await db.businessPlan.count({ take: 1 });
    businessPlanTableVerified = true;
    return;
  } catch {
    // Table may not exist yet if migrations were not applied automatically
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS "BusinessPlan" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "instituteId" TEXT NOT NULL,
      "title" TEXT NOT NULL DEFAULT 'Untitled Business Plan',
      "documentType" TEXT NOT NULL DEFAULT 'BUSINESS_PLAN',
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "businessCategory" TEXT NOT NULL DEFAULT 'FOOD_BEVERAGE',
      "data" JSONB NOT NULL,
      "templateId" TEXT,
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BusinessPlan_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "BusinessPlan_studentId_status_idx" ON "BusinessPlan"("studentId", "status")`,
    `CREATE INDEX IF NOT EXISTS "BusinessPlan_studentId_updatedAt_idx" ON "BusinessPlan"("studentId", "updatedAt")`,
    `CREATE INDEX IF NOT EXISTS "BusinessPlan_instituteId_idx" ON "BusinessPlan"("instituteId")`,
    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessPlan_studentId_fkey') THEN
        ALTER TABLE "BusinessPlan" ADD CONSTRAINT "BusinessPlan_studentId_fkey"
          FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessPlan_instituteId_fkey') THEN
        ALTER TABLE "BusinessPlan" ADD CONSTRAINT "BusinessPlan_instituteId_fkey"
          FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,
    `DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "BusinessPlan" TO lms_web_runtime_v1;
      END IF;
    END $$`,
  ];

  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch {
      // Ignore individual constraint/grant failures on restricted DB roles
    }
  }
  businessPlanTableVerified = true;
}

export async function loadOwnedBusinessPlan(id: string, studentId: string) {
  if (!BUSINESS_PLAN_ID.test(id)) return null;
  await ensureBusinessPlanTable();
  return db.businessPlan.findFirst({ where: { id, studentId } });
}
