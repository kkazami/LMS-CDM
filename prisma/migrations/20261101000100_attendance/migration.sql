BEGIN;

-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('IN_PERSON', 'LIVE_REMOTE', 'ASYNCHRONOUS');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'TARDY', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AttendanceState" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceVerification" AS ENUM ('NOT_CHECKED', 'NEARBY', 'OUTSIDE', 'UNCLEAR', 'DECLINED', 'MOCK_REPORTED');

-- CreateEnum
CREATE TYPE "AttendanceRequestState" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "Institute" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Manila';

-- CreateTable
CREATE TABLE "AttendancePolicy" (
    "instituteId" TEXT NOT NULL,
    "rollout" TEXT NOT NULL DEFAULT 'DISABLED',
    "phase" INTEGER NOT NULL DEFAULT 1,
    "pilotCourseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "locationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "privacyReview" TEXT NOT NULL DEFAULT '',
    "recordDays" INTEGER,
    "eventDays" INTEGER,
    "requestDays" INTEGER,
    "verificationDays" INTEGER,
    "arrangementDays" INTEGER,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("instituteId")
);

-- CreateTable
CREATE TABLE "AttendanceSettings" (
    "courseId" TEXT NOT NULL,
    "liveLimit" INTEGER NOT NULL DEFAULT 1,
    "asyncLimit" INTEGER NOT NULL DEFAULT 1,
    "absenceThreshold" INTEGER NOT NULL DEFAULT 3,
    "tardyThreshold" INTEGER NOT NULL DEFAULT 3,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "locationLabel" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "AttendanceSettings_pkey" PRIMARY KEY ("courseId")
);

-- CreateTable
CREATE TABLE "AttendanceSession" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "mode" "AttendanceMode" NOT NULL,
    "state" "AttendanceState" NOT NULL DEFAULT 'OPEN',
    "opensAt" TIMESTAMPTZ(3) NOT NULL,
    "closesAt" TIMESTAMPTZ(3) NOT NULL,
    "presentUntil" TIMESTAMPTZ(3) NOT NULL,
    "closedAt" TIMESTAMPTZ(3),
    "sessionDate" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "requiresLocation" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radius" INTEGER NOT NULL DEFAULT 150,
    "qrGraceSeconds" INTEGER NOT NULL DEFAULT 10,
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "liveCodeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "legalHold" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "AttendanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "eligibilityReason" TEXT NOT NULL DEFAULT '',
    "eligibleAt" TIMESTAMPTZ(3) NOT NULL,
    "presentUntil" TIMESTAMPTZ(3) NOT NULL,
    "status" "AttendanceStatus",
    "source" TEXT NOT NULL DEFAULT '',
    "verification" "AttendanceVerification" NOT NULL DEFAULT 'NOT_CHECKED',
    "markedAt" TIMESTAMPTZ(3),
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRequest" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "state" "AttendanceRequestState" NOT NULL DEFAULT 'PENDING',
    "verification" "AttendanceVerification" NOT NULL DEFAULT 'NOT_CHECKED',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMPTZ(3),
    "decisionReason" TEXT,
    "textExpiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "AttendanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceVerificationDetail" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "distance" DOUBLE PRECISION,
    "accuracy" DOUBLE PRECISION,
    "outcome" "AttendanceVerification" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AttendanceVerificationDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sessionId" TEXT,
    "actorId" TEXT,
    "studentId" TEXT,
    "action" TEXT NOT NULL,
    "beforeStatus" "AttendanceStatus",
    "afterStatus" "AttendanceStatus",
    "source" TEXT NOT NULL DEFAULT '',
    "verification" "AttendanceVerification" NOT NULL DEFAULT 'NOT_CHECKED',
    "reason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceArrangement" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AttendanceArrangement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceGrant" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceJob" (
    "id" TEXT NOT NULL DEFAULT 'retention',
    "lastStartedAt" TIMESTAMPTZ(3),
    "lastSuccessAt" TIMESTAMPTZ(3),
    "leaseUntil" TIMESTAMPTZ(3),
    "backlog" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttendanceJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceSession_courseId_state_closesAt_idx" ON "AttendanceSession"("courseId", "state", "closesAt");

-- CreateIndex
CREATE INDEX "AttendanceSession_courseId_sessionDate_idx" ON "AttendanceSession"("courseId", "sessionDate");

-- CreateIndex
CREATE INDEX "AttendanceSession_expiresAt_idx" ON "AttendanceSession"("expiresAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_studentId_sessionId_idx" ON "AttendanceRecord"("studentId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_studentId_key" ON "AttendanceRecord"("sessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRequest_recordId_key" ON "AttendanceRequest"("recordId");

-- CreateIndex
CREATE INDEX "AttendanceRequest_textExpiresAt_idx" ON "AttendanceRequest"("textExpiresAt");

-- CreateIndex
CREATE INDEX "AttendanceVerificationDetail_expiresAt_idx" ON "AttendanceVerificationDetail"("expiresAt");

-- CreateIndex
CREATE INDEX "AttendanceEvent_courseId_createdAt_idx" ON "AttendanceEvent"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "AttendanceEvent_expiresAt_idx" ON "AttendanceEvent"("expiresAt");

-- CreateIndex
CREATE INDEX "AttendanceArrangement_expiresAt_idx" ON "AttendanceArrangement"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceArrangement_courseId_studentId_key" ON "AttendanceArrangement"("courseId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceGrant_courseId_userId_key" ON "AttendanceGrant"("courseId", "userId");

-- AddForeignKey
ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSettings" ADD CONSTRAINT "AttendanceSettings_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRequest" ADD CONSTRAINT "AttendanceRequest_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceVerificationDetail" ADD CONSTRAINT "AttendanceVerificationDetail_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AttendanceSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceArrangement" ADD CONSTRAINT "AttendanceArrangement_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceGrant" ADD CONSTRAINT "AttendanceGrant_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AttendancePolicy" ADD CONSTRAINT "AttendancePolicy_bounds" CHECK ("phase" BETWEEN 1 AND 3 AND "rollout" IN ('DISABLED', 'PILOT', 'ENABLED'));
ALTER TABLE "AttendanceSettings" ADD CONSTRAINT "AttendanceSettings_limits" CHECK ("liveLimit" BETWEEN 1 AND 10 AND "asyncLimit" BETWEEN 1 AND 10 AND "absenceThreshold" BETWEEN 2 AND 20 AND "tardyThreshold" BETWEEN 2 AND 20);
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_timing" CHECK ("closesAt" > "opensAt" AND "presentUntil" >= "opensAt" AND "presentUntil" <= "closesAt" AND "qrGraceSeconds" BETWEEN 3 AND 15 AND "radius" BETWEEN 100 AND 500 AND (NOT "requiresLocation" OR ("mode" = 'IN_PERSON' AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL)) AND (NOT "liveCodeEnabled" OR "mode" = 'LIVE_REMOTE'));

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "AttendancePolicy", "AttendanceSettings", "AttendanceSession", "AttendanceRecord", "AttendanceRequest", "AttendanceVerificationDetail", "AttendanceArrangement", "AttendanceGrant", "AttendanceJob" TO lms_web_runtime_v1;
    GRANT SELECT, INSERT, DELETE ON TABLE "AttendanceEvent" TO lms_web_runtime_v1;
    REVOKE UPDATE ON TABLE "AttendanceEvent" FROM lms_web_runtime_v1;
  END IF;
END $$;

COMMIT;
