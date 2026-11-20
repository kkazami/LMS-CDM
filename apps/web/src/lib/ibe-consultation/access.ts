import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { NextResponse } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Pool } from "pg";
import { getSession } from "@/lib/auth-session";
import { getSessionFromRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { resolveIbeStudentProgram } from "@/lib/ibe-programs/registration";
import {
  checkIbeConsultationEligibility,
  IBE_CONSULTATION_INSTITUTE_CODE,
} from "./rules";
import type { ConsultationActor, ConsultationActorRole } from "./types";

export class ConsultationHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function consultationErrorResponse(error: unknown): NextResponse {
  if (error instanceof ConsultationHttpError) {
    return NextResponse.json(
      { error: error.message, message: error.message },
      { status: error.status }
    );
  }
  console.error("[IBE_CONSULTATION_API_ERROR]", error);
  return NextResponse.json(
    {
      error: "An unexpected error occurred while processing the consultation request.",
      message: "An unexpected error occurred while processing the consultation request.",
    },
    { status: 500 }
  );
}

/** Same-origin guard for state-changing requests (defense in depth). */
export function sameOriginViolation(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD") return null;
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return null;
    const normalizeLocal = (h: string) =>
      h.replace(/^127\.0\.0\.1(?=:|$)/, "localhost");
    if (host && normalizeLocal(originHost) === normalizeLocal(host)) {
      return null;
    }
  } catch {
    /* fall through */
  }
  return NextResponse.json(
    {
      error: "Cross-origin mutation rejected.",
      message: "Cross-origin mutation rejected.",
    },
    { status: 403 }
  );
}

/**
 * Resolves the authenticated session user and verifies strict IBE student / instructor eligibility.
 */
async function resolveActorFromSessionUser(
  sessionUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
    isActive?: boolean | null;
    activationStatus?: string | null;
    studentNumber?: string | null;
    instituteId: string;
    institute?: { id: string; code: string; name?: string } | null;
  },
  allowedRoles?: readonly ConsultationActorRole[]
): Promise<
  | { ok: true; actor: ConsultationActor }
  | { ok: false; status: 401 | 403; message: string }
> {
  // Always verify institute code from session or DB
  let instituteCode = sessionUser.institute?.code?.toLowerCase() ?? "";
  if (!instituteCode && sessionUser.instituteId) {
    const inst = await db.institute.findUnique({
      where: { id: sessionUser.instituteId },
      select: { code: true },
    });
    instituteCode = inst?.code?.toLowerCase() ?? "";
  }

  const check = checkIbeConsultationEligibility({
    role: sessionUser.role,
    instituteCode,
    isActive: sessionUser.isActive,
    activationStatus: sessionUser.activationStatus,
  });

  if (!check.eligible) {
    return {
      ok: false,
      status: 403,
      message: check.reason,
    };
  }

  if (allowedRoles && !allowedRoles.includes(check.role)) {
    return {
      ok: false,
      status: 403,
      message: `Forbidden: This consultation action requires ${allowedRoles.join(" or ")} role.`,
    };
  }

  let programCode: "BSBA HRM" | "BS ENTREP" | null = null;
  if (check.role === "STUDENT") {
    const resolvedProgram = await resolveIbeStudentProgram(sessionUser.id);
    programCode = resolvedProgram?.programCode ?? null;
  }

  return {
    ok: true,
    actor: {
      userId: sessionUser.id,
      name: sessionUser.name || (check.role === "STUDENT" ? "IBE Student" : "IBE Instructor"),
      email: sessionUser.email || "",
      role: check.role,
      instituteId: sessionUser.instituteId,
      instituteCode: IBE_CONSULTATION_INSTITUTE_CODE,
      studentNumber: sessionUser.studentNumber ?? null,
      programCode,
    },
  };
}

/**
 * API route guard for IBE Consultation endpoints.
 */
export async function requireIbeConsultationActor(
  request: Request,
  allowedRoles?: readonly ConsultationActorRole[]
): Promise<
  | { actor: ConsultationActor; errorResponse?: never }
  | { actor?: never; errorResponse: NextResponse }
> {
  const session = await getSessionFromRequest(request);
  if (!session?.user) {
    return {
      errorResponse: NextResponse.json(
        {
          error: "Authentication required. Please sign in.",
          message: "Authentication required. Please sign in.",
        },
        { status: 401 }
      ),
    };
  }

  const result = await resolveActorFromSessionUser(
    session.user as Parameters<typeof resolveActorFromSessionUser>[0],
    allowedRoles
  );

  if (!result.ok) {
    return {
      errorResponse: NextResponse.json(
        { error: result.message, message: result.message },
        { status: result.status }
      ),
    };
  }

  return { actor: result.actor };
}

/**
 * Page route guard for IBE Consultation server components.
 */
export async function requireIbeConsultationPageActor(
  instituteParam: string,
  allowedRoles?: readonly ConsultationActorRole[]
): Promise<ConsultationActor> {
  if (instituteParam.trim().toLowerCase() !== IBE_CONSULTATION_INSTITUTE_CODE) {
    notFound();
  }

  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?institute=${instituteParam}`);
  }

  const result = await resolveActorFromSessionUser(
    session.user as Parameters<typeof resolveActorFromSessionUser>[0],
    allowedRoles
  );

  if (!result.ok) {
    notFound();
  }

  return result.actor;
}

// ─── Idempotent Table Readiness Guard ────────────────────────────────────────

let consultationTablesVerified = false;
let consultationTablesPromise: Promise<void> | null = null;

function resolveOwnerDatabaseUrl(): string | null {
  if (process.env.OWNER_DATABASE_URL?.trim()) {
    return process.env.OWNER_DATABASE_URL.trim();
  }
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", "..", ".env"),
  ];
  for (const envPath of candidates) {
    try {
      if (!fs.existsSync(envPath)) continue;
      const parsed = parseEnv(fs.readFileSync(envPath, "utf8"));
      const url =
        parsed.OWNER_DATABASE_URL ||
        parsed.DIRECT_URL ||
        parsed.POSTGRES_URL_NON_POOLING ||
        parsed.DATABASE_URL;
      if (url && typeof url === "string" && url.trim()) {
        return url.trim();
      }
    } catch {
      // Ignore read errors
    }
  }
  return null;
}

async function runConsultationDdl(): Promise<void> {
  try {
    await db.$queryRaw`SELECT 1 FROM "Appointment" LIMIT 1`;
    await db.$queryRaw`SELECT 1 FROM "InstructorAvailability" LIMIT 1`;
    await db.$queryRaw`SELECT 1 FROM "InstructorBlockedDate" LIMIT 1`;
    await db.$queryRaw`SELECT 1 FROM "AppointmentAttachment" LIMIT 1`;
    await db.$queryRaw`SELECT 1 FROM "AppointmentMessage" LIMIT 1`;
    consultationTablesVerified = true;
    return;
  } catch {
    // Tables may not exist or runtime role may need GRANTs
  }

  const statements = [
    `CREATE TABLE IF NOT EXISTS "InstructorAvailability" (
      "id" TEXT NOT NULL,
      "instructorId" TEXT NOT NULL,
      "dayOfWeek" INTEGER NOT NULL,
      "startTime" TEXT NOT NULL,
      "endTime" TEXT NOT NULL,
      "slotDuration" INTEGER NOT NULL DEFAULT 30,
      "maxAppointmentsPerDay" INTEGER NOT NULL DEFAULT 8,
      "meetingType" TEXT NOT NULL DEFAULT 'BOTH',
      "location" TEXT NOT NULL DEFAULT '',
      "meetingLink" TEXT NOT NULL DEFAULT '',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "isSuspended" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InstructorAvailability_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "InstructorAvailability_instructorId_dayOfWeek_isActive_idx" ON "InstructorAvailability"("instructorId", "dayOfWeek", "isActive")`,
    `CREATE INDEX IF NOT EXISTS "InstructorAvailability_instructorId_idx" ON "InstructorAvailability"("instructorId")`,

    `CREATE TABLE IF NOT EXISTS "InstructorBlockedDate" (
      "id" TEXT NOT NULL,
      "instructorId" TEXT NOT NULL,
      "startAt" TIMESTAMP(3) NOT NULL,
      "endAt" TIMESTAMP(3) NOT NULL,
      "reason" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InstructorBlockedDate_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "InstructorBlockedDate_instructorId_startAt_endAt_idx" ON "InstructorBlockedDate"("instructorId", "startAt", "endAt")`,

    `CREATE TABLE IF NOT EXISTS "Appointment" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "instructorId" TEXT NOT NULL,
      "subjectId" TEXT NOT NULL,
      "availabilityId" TEXT,
      "title" TEXT NOT NULL,
      "reason" TEXT NOT NULL,
      "additionalMessage" TEXT,
      "requestedStartAt" TIMESTAMP(3) NOT NULL,
      "requestedEndAt" TIMESTAMP(3) NOT NULL,
      "proposedStartAt" TIMESTAMP(3),
      "proposedEndAt" TIMESTAMP(3),
      "meetingType" TEXT NOT NULL DEFAULT 'FACE_TO_FACE',
      "meetingLocation" TEXT,
      "meetingLink" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "attendanceOutcome" TEXT,
      "instructorResponse" TEXT,
      "rejectionReason" TEXT,
      "cancellationReason" TEXT,
      "cancelledByRole" TEXT,
      "confirmedAt" TIMESTAMP(3),
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "Appointment_studentId_status_requestedStartAt_idx" ON "Appointment"("studentId", "status", "requestedStartAt")`,
    `CREATE INDEX IF NOT EXISTS "Appointment_studentId_createdAt_idx" ON "Appointment"("studentId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "Appointment_instructorId_status_requestedStartAt_idx" ON "Appointment"("instructorId", "status", "requestedStartAt")`,
    `CREATE INDEX IF NOT EXISTS "Appointment_instructorId_createdAt_idx" ON "Appointment"("instructorId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "Appointment_subjectId_idx" ON "Appointment"("subjectId")`,

    `CREATE TABLE IF NOT EXISTS "AppointmentAttachment" (
      "id" TEXT NOT NULL,
      "appointmentId" TEXT NOT NULL,
      "originalFileName" TEXT NOT NULL,
      "storedFileName" TEXT NOT NULL,
      "storageKey" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "fileSize" INTEGER NOT NULL,
      "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AppointmentAttachment_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "AppointmentAttachment_appointmentId_idx" ON "AppointmentAttachment"("appointmentId")`,
    `CREATE INDEX IF NOT EXISTS "AppointmentAttachment_storageKey_idx" ON "AppointmentAttachment"("storageKey")`,

    `CREATE TABLE IF NOT EXISTS "AppointmentMessage" (
      "id" TEXT NOT NULL,
      "appointmentId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AppointmentMessage_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "AppointmentMessage_appointmentId_createdAt_idx" ON "AppointmentMessage"("appointmentId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "AppointmentMessage_senderId_idx" ON "AppointmentMessage"("senderId")`,

    `DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorAvailability_instructorId_fkey') THEN
        ALTER TABLE "InstructorAvailability" ADD CONSTRAINT "InstructorAvailability_instructorId_fkey"
          FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorBlockedDate_instructorId_fkey') THEN
        ALTER TABLE "InstructorBlockedDate" ADD CONSTRAINT "InstructorBlockedDate_instructorId_fkey"
          FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_studentId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_studentId_fkey"
          FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_instructorId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_instructorId_fkey"
          FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_subjectId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_subjectId_fkey"
          FOREIGN KEY ("subjectId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_availabilityId_fkey') THEN
        ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_availabilityId_fkey"
          FOREIGN KEY ("availabilityId") REFERENCES "InstructorAvailability"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentAttachment_appointmentId_fkey') THEN
        ALTER TABLE "AppointmentAttachment" ADD CONSTRAINT "AppointmentAttachment_appointmentId_fkey"
          FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentMessage_appointmentId_fkey') THEN
        ALTER TABLE "AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_appointmentId_fkey"
          FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentMessage_senderId_fkey') THEN
        ALTER TABLE "AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_senderId_fkey"
          FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$`,

    `DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "InstructorAvailability" TO lms_web_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "InstructorBlockedDate" TO lms_web_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Appointment" TO lms_web_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AppointmentAttachment" TO lms_web_app;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AppointmentMessage" TO lms_web_app;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "InstructorAvailability" TO lms_web_runtime_v1;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "InstructorBlockedDate" TO lms_web_runtime_v1;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Appointment" TO lms_web_runtime_v1;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AppointmentAttachment" TO lms_web_runtime_v1;
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AppointmentMessage" TO lms_web_runtime_v1;
      END IF;
    END $$`,
  ];

  let ddlFailedOnRuntimeDb = false;
  for (const sql of statements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch {
      ddlFailedOnRuntimeDb = true;
      break;
    }
  }

  if (ddlFailedOnRuntimeDb) {
    const ownerUrl = resolveOwnerDatabaseUrl();
    if (ownerUrl) {
      const target = new URL(ownerUrl);
      const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(
        target.hostname
      );
      if (!isLocalhost) {
        target.searchParams.delete("uselibpqcompat");
        target.searchParams.set("sslmode", "verify-full");
      }
      const ownerPool = new Pool({
        connectionString: target.toString(),
        max: 2,
        ssl: !isLocalhost ? { rejectUnauthorized: true } : undefined,
      });
      try {
        for (const sql of statements) {
          await ownerPool.query(sql);
        }
      } catch (err) {
        console.warn(
          "[ensureConsultationTables] Owner DDL warning:",
          err instanceof Error ? err.message : String(err)
        );
      } finally {
        await ownerPool.end().catch(() => {});
      }
    }
  }

  try {
    await db.$queryRaw`SELECT 1 FROM "Appointment" LIMIT 1`;
    consultationTablesVerified = true;
  } catch {
    // Keep consultationTablesVerified = false so a subsequent call retries if needed
  }
}

export async function ensureConsultationTables(): Promise<void> {
  if (consultationTablesVerified) return;
  if (!consultationTablesPromise) {
    consultationTablesPromise = runConsultationDdl().finally(() => {
      consultationTablesPromise = null;
    });
  }
  await consultationTablesPromise;
}

