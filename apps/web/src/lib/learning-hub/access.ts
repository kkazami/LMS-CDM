import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../api-auth";
import { db } from "../db";
import { isLearningHubEligible, LEARNING_HUB_INSTITUTE_CODE } from "./eligibility";
import {
  LEARNING_RECORD_ID,
  toStudentLearningRecord,
  type RawIbeLearningRecordRow,
} from "./validation";

export {
  isLearningHubEligible,
  LEARNING_HUB_INSTITUTE_CODE,
  LEARNING_RECORD_ID,
  toStudentLearningRecord,
  type RawIbeLearningRecordRow,
};

export type StudentLearningHubAccess =
  | { ok: true; userId: string; instituteId: string; name: string }
  | { ok: false; status: 401 | 403; message: string };

export async function requireLearningHubStudent(
  request?: Request
): Promise<StudentLearningHubAccess> {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  const user = session.user;
  if (!isLearningHubEligible(user)) {
    return {
      ok: false,
      status: 403,
      message: "The IBE Learning Hub is available to authenticated IBE students only.",
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

export function denied(
  access: Extract<StudentLearningHubAccess, { ok: false }>
): NextResponse {
  return NextResponse.json({ message: access.message }, { status: access.status });
}

let learningHubTableVerified = false;

export async function ensureLearningHubTable(): Promise<void> {
  if (learningHubTableVerified) return;
  try {
    await db.ibeLearningRecord.count({ take: 1 });
    learningHubTableVerified = true;
    return;
  } catch {
    // Table may not exist yet if migrations were not applied automatically
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS "IbeLearningRecord" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "instituteId" TEXT NOT NULL,
      "courseId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PLANNED',
      "completedAt" TIMESTAMP(3),
      "certificateUrl" TEXT NOT NULL DEFAULT '',
      "notes" TEXT NOT NULL DEFAULT '',
      "verificationType" TEXT NOT NULL DEFAULT 'SELF_REPORTED',
      "lastOpenedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "IbeLearningRecord_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "IbeLearningRecord_studentId_courseId_key" ON "IbeLearningRecord"("studentId", "courseId")`,
    `CREATE INDEX IF NOT EXISTS "IbeLearningRecord_studentId_status_idx" ON "IbeLearningRecord"("studentId", "status")`,
    `CREATE INDEX IF NOT EXISTS "IbeLearningRecord_studentId_updatedAt_idx" ON "IbeLearningRecord"("studentId", "updatedAt")`,
    `CREATE INDEX IF NOT EXISTS "IbeLearningRecord_instituteId_idx" ON "IbeLearningRecord"("instituteId")`,
    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IbeLearningRecord_studentId_fkey') THEN
        ALTER TABLE "IbeLearningRecord" ADD CONSTRAINT "IbeLearningRecord_studentId_fkey"
          FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IbeLearningRecord_instituteId_fkey') THEN
        ALTER TABLE "IbeLearningRecord" ADD CONSTRAINT "IbeLearningRecord_instituteId_fkey"
          FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,
    `DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "IbeLearningRecord" TO lms_web_runtime_v1;
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
  learningHubTableVerified = true;
}

export async function loadOwnedLearningRecord(id: string, studentId: string) {
  if (!LEARNING_RECORD_ID.test(id)) return null;
  await ensureLearningHubTable();
  return db.ibeLearningRecord.findFirst({ where: { id, studentId } });
}

