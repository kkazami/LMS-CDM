-- Additive rollout stage: no existing account identifiers or credentials are rewritten.
-- This stage permits existing-account login while roster conflicts are reconciled.
BEGIN;
DO $baseline$ BEGIN
 IF to_regclass('public."ProgramMembership"') IS NULL THEN RAISE EXCEPTION 'CURRENT_ACADEMIC_BASELINE_REQUIRED'; END IF;
 IF EXISTS(SELECT 1 FROM "User" GROUP BY lower(btrim(email)) HAVING count(*)>1) THEN RAISE EXCEPTION 'ROSTER_RECONCILIATION_REQUIRED: duplicate emails'; END IF;
END $baseline$;
-- CreateEnum
CREATE TYPE "AccountActivationStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activatedAt" TIMESTAMP(3),
ADD COLUMN     "activationStatus" "AccountActivationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "invitationVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "section" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "termId" TEXT;

-- CreateTable
CREATE TABLE "AcademicTerm" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountActivationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitationVersion" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "attemptId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "termId" TEXT,
    "creatorId" TEXT NOT NULL,
    "matchOnly" BOOLEAN NOT NULL DEFAULT false,
    "policy" TEXT NOT NULL DEFAULT 'SKIP',
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "values" JSONB NOT NULL,
    "originalValues" JSONB NOT NULL,
    "previousValues" JSONB,
    "issues" JSONB NOT NULL,
    "proposedAction" TEXT NOT NULL,
    "targetId" TEXT,
    "targetHash" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "overrideRejected" BOOLEAN NOT NULL DEFAULT false,
    "outcome" TEXT,
    "error" TEXT,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "invitationVersion" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'INVITATION',
    "requestedById" TEXT,
    "parentJobId" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSendAttempt" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitationVersion" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "outcome" TEXT NOT NULL DEFAULT 'STARTED',
    "messageId" TEXT,
    "errorCode" TEXT,

    CONSTRAINT "EmailSendAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSenderState" (
    "id" TEXT NOT NULL,
    "leaseUntil" TIMESTAMP(3),
    "leaseOwner" TEXT,
    "nextSendAt" TIMESTAMP(3),
    "pausedUntil" TIMESTAMP(3),
    "pauseReason" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastProcessedAt" TIMESTAMP(3),
    "smtpVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "EmailSenderState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_id_instituteId_key" ON "AcademicTerm"("id", "instituteId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicTerm_instituteId_code_key" ON "AcademicTerm"("instituteId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "AccountActivationToken_tokenHash_key" ON "AccountActivationToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AccountActivationToken_attemptId_key" ON "AccountActivationToken"("attemptId");

-- CreateIndex
CREATE INDEX "AccountActivationToken_userId_invitationVersion_idx" ON "AccountActivationToken"("userId", "invitationVersion");

-- CreateIndex
CREATE INDEX "ImportBatch_instituteId_creatorId_createdAt_idx" ON "ImportBatch"("instituteId", "creatorId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_batchId_outcome_idx" ON "ImportRow"("batchId", "outcome");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_batchId_rowNumber_key" ON "ImportRow"("batchId", "rowNumber");

-- CreateIndex
CREATE UNIQUE INDEX "EmailJob_dedupeKey_key" ON "EmailJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailJob_status_scheduledAt_idx" ON "EmailJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "EmailJob_userId_invitationVersion_createdAt_idx" ON "EmailJob"("userId", "invitationVersion", "createdAt");

-- CreateIndex
CREATE INDEX "EmailSendAttempt_startedAt_idx" ON "EmailSendAttempt"("startedAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex


-- CreateIndex
CREATE UNIQUE INDEX "Course_instituteId_termId_code_section_key" ON "Course"("instituteId", "termId", "code", "section");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_termId_instituteId_fkey" FOREIGN KEY ("termId", "instituteId") REFERENCES "AcademicTerm"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicTerm" ADD CONSTRAINT "AcademicTerm_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountActivationToken" ADD CONSTRAINT "AccountActivationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountActivationToken" ADD CONSTRAINT "AccountActivationToken_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EmailSendAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailSendAttempt" ADD CONSTRAINT "EmailSendAttempt_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "EmailJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "User_email_normalized_key" ON "User"(lower(btrim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS "ProgramMembership_one_student_home" ON "ProgramMembership"("userId") WHERE kind='STUDENT' AND "isActive";
CREATE UNIQUE INDEX "AcademicTerm_one_current" ON "AcademicTerm"("instituteId") WHERE "isCurrent";
CREATE UNIQUE INDEX "Course_offering_normalized_key" ON "Course"("instituteId","termId",upper(btrim(code)),upper(btrim(section))) WHERE "termId" IS NOT NULL;
CREATE UNIQUE INDEX "EmailJob_one_pending" ON "EmailJob"("userId","invitationVersion") WHERE status IN ('QUEUED','PROCESSING');
ALTER TABLE "User" ADD CONSTRAINT "User_activation_credentials_check" CHECK (("activationStatus"='PENDING_ACTIVATION' AND upper(role)='STUDENT' AND password IS NULL) OR ("activationStatus"='ACTIVE' AND password IS NOT NULL));
CREATE FUNCTION public.activation_session_admission() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $activation$
BEGIN
 IF EXISTS(SELECT 1 FROM public."User" WHERE id=NEW."userId" AND "activationStatus"='PENDING_ACTIVATION' FOR SHARE) THEN
  RAISE EXCEPTION 'ACCOUNT_ACTIVATION_REQUIRED' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $activation$;
REVOKE ALL ON FUNCTION public.activation_session_admission() FROM PUBLIC;
CREATE TRIGGER activation_session_admission BEFORE INSERT OR UPDATE OF "userId" ON "Session" FOR EACH ROW EXECUTE FUNCTION public.activation_session_admission();
ALTER TABLE "ImportBatch" ADD FOREIGN KEY ("creatorId","instituteId") REFERENCES "User"(id,"instituteId") ON DELETE RESTRICT;
ALTER TABLE "ImportBatch" ADD FOREIGN KEY ("termId","instituteId") REFERENCES "AcademicTerm"(id,"instituteId") ON DELETE RESTRICT;
ALTER TABLE "EmailJob" ADD FOREIGN KEY ("userId","instituteId") REFERENCES "User"(id,"instituteId") ON DELETE RESTRICT;
ALTER TABLE "EmailJob" ADD FOREIGN KEY ("requestedById") REFERENCES "User"(id) ON DELETE RESTRICT;
ALTER TABLE "EmailJob" ADD FOREIGN KEY ("parentJobId") REFERENCES "EmailJob"(id) ON DELETE RESTRICT;


COMMIT;
