-- CreateEnum
CREATE TYPE "SubmissionWorkHistoryState" AS ENUM ('UNKNOWN', 'UNTOUCHED', 'STARTED');

-- CreateEnum
CREATE TYPE "LabVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "LabStepType" AS ENUM ('INSTRUCTIONS', 'COMMAND', 'CHECKLIST', 'TEXT_RESPONSE', 'EVIDENCE_UPLOAD');

-- CreateEnum
CREATE TYPE "LabAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'GRADED');

-- AlterTable
ALTER TABLE "SyllabusItem" ADD COLUMN     "workHistoryState" "SubmissionWorkHistoryState" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable
ALTER TABLE "StudentSubmission" ADD COLUMN     "workHistoryState" "SubmissionWorkHistoryState" NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "LabTemplate" (
    "id" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "sourceTemplateId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "status" "LabVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "objective" TEXT NOT NULL,
    "prerequisites" TEXT NOT NULL DEFAULT '',
    "requiredTools" TEXT NOT NULL DEFAULT '',
    "estimatedMinutes" INTEGER NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabStep" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" "LabStepType" NOT NULL,
    "title" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,

    CONSTRAINT "LabStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabAssignment" (
    "id" TEXT NOT NULL,
    "syllabusItemId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "personalizeEvidence" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabAttempt" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "LabAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "score" DECIMAL(10,2),
    "evidenceToken" TEXT NOT NULL,
    "revisionDueAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "LabAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabStepResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabStepResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSubmission" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabEvidence" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "supersededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabSubmissionEvidence" (
    "submissionId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,

    CONSTRAINT "LabSubmissionEvidence_pkey" PRIMARY KEY ("submissionId","evidenceId")
);

-- CreateTable
CREATE TABLE "LabReview" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "stepId" TEXT,
    "decision" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "score" DECIMAL(10,2),
    "revisionDueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabTemplate_instituteId_authorId_idx" ON "LabTemplate"("instituteId", "authorId");

-- CreateIndex
CREATE UNIQUE INDEX "LabTemplateVersion_templateId_number_key" ON "LabTemplateVersion"("templateId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "LabStep_id_versionId_key" ON "LabStep"("id", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "LabStep_versionId_key_key" ON "LabStep"("versionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "LabStep_versionId_position_key" ON "LabStep"("versionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LabAssignment_syllabusItemId_key" ON "LabAssignment"("syllabusItemId");

-- CreateIndex
CREATE INDEX "LabAssignment_courseId_publishedAt_idx" ON "LabAssignment"("courseId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LabAssignment_id_versionId_key" ON "LabAssignment"("id", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "LabAssignment_syllabusItemId_courseId_key" ON "LabAssignment"("syllabusItemId", "courseId");

-- CreateIndex
CREATE INDEX "LabAttempt_assignmentId_status_idx" ON "LabAttempt"("assignmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LabAttempt_assignmentId_studentId_key" ON "LabAttempt"("assignmentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "LabAttempt_assignmentId_studentId_attemptNumber_key" ON "LabAttempt"("assignmentId", "studentId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LabAttempt_id_versionId_key" ON "LabAttempt"("id", "versionId");

-- CreateIndex
CREATE UNIQUE INDEX "LabStepResponse_attemptId_stepId_key" ON "LabStepResponse"("attemptId", "stepId");

-- CreateIndex
CREATE UNIQUE INDEX "LabSubmission_attemptId_round_key" ON "LabSubmission"("attemptId", "round");

-- CreateIndex
CREATE UNIQUE INDEX "LabSubmission_id_attemptId_key" ON "LabSubmission"("id", "attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "LabEvidence_assetId_key" ON "LabEvidence"("assetId");

-- CreateIndex
CREATE INDEX "LabEvidence_responseId_supersededAt_idx" ON "LabEvidence"("responseId", "supersededAt");

-- CreateIndex
CREATE INDEX "LabReview_attemptId_createdAt_idx" ON "LabReview"("attemptId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyllabusItem_id_courseId_key" ON "SyllabusItem"("id", "courseId");

-- AddForeignKey
ALTER TABLE "LabTemplate" ADD CONSTRAINT "LabTemplate_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTemplate" ADD CONSTRAINT "LabTemplate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTemplateVersion" ADD CONSTRAINT "LabTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "LabTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabStep" ADD CONSTRAINT "LabStep_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LabTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAssignment" ADD CONSTRAINT "LabAssignment_syllabusItemId_courseId_fkey" FOREIGN KEY ("syllabusItemId", "courseId") REFERENCES "SyllabusItem"("id", "courseId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAssignment" ADD CONSTRAINT "LabAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAssignment" ADD CONSTRAINT "LabAssignment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LabTemplateVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAssignment" ADD CONSTRAINT "LabAssignment_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAttempt" ADD CONSTRAINT "LabAttempt_assignmentId_versionId_fkey" FOREIGN KEY ("assignmentId", "versionId") REFERENCES "LabAssignment"("id", "versionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabAttempt" ADD CONSTRAINT "LabAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabStepResponse" ADD CONSTRAINT "LabStepResponse_attemptId_versionId_fkey" FOREIGN KEY ("attemptId", "versionId") REFERENCES "LabAttempt"("id", "versionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabStepResponse" ADD CONSTRAINT "LabStepResponse_stepId_versionId_fkey" FOREIGN KEY ("stepId", "versionId") REFERENCES "LabStep"("id", "versionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSubmission" ADD CONSTRAINT "LabSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "LabAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabEvidence" ADD CONSTRAINT "LabEvidence_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "LabStepResponse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabEvidence" ADD CONSTRAINT "LabEvidence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "PrivateAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSubmissionEvidence" ADD CONSTRAINT "LabSubmissionEvidence_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "LabSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabSubmissionEvidence" ADD CONSTRAINT "LabSubmissionEvidence_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "LabEvidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_attemptId_versionId_fkey" FOREIGN KEY ("attemptId", "versionId") REFERENCES "LabAttempt"("id", "versionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_submissionId_attemptId_fkey" FOREIGN KEY ("submissionId", "attemptId") REFERENCES "LabSubmission"("id", "attemptId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_stepId_versionId_fkey" FOREIGN KEY ("stepId", "versionId") REFERENCES "LabStep"("id", "versionId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Provenance is monotonic: neither historical unknown work nor started work can
-- be relabelled untouched after attachments or a grade have been cleared.
CREATE FUNCTION public.lab_protect_provenance() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD."workHistoryState" = 'STARTED' AND NEW."workHistoryState" <> 'STARTED')
     OR (OLD."workHistoryState" = 'UNKNOWN' AND NEW."workHistoryState" = 'UNTOUCHED') THEN
    RAISE EXCEPTION 'Academic provenance cannot be reset' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER syllabus_provenance_monotonic BEFORE UPDATE ON "SyllabusItem"
FOR EACH ROW EXECUTE FUNCTION public.lab_protect_provenance();
CREATE TRIGGER submission_provenance_monotonic BEFORE UPDATE ON "StudentSubmission"
FOR EACH ROW EXECUTE FUNCTION public.lab_protect_provenance();

CREATE FUNCTION public.lab_protect_published_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'PUBLISHED' THEN
    RAISE EXCEPTION 'Published lab versions are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER lab_version_immutable BEFORE UPDATE OR DELETE ON "LabTemplateVersion"
FOR EACH ROW EXECUTE FUNCTION public.lab_protect_published_version();

CREATE FUNCTION public.lab_protect_published_steps() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' AND EXISTS (SELECT 1 FROM "LabTemplateVersion" WHERE id = OLD."versionId" AND status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'Published lab steps are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP <> 'DELETE' AND EXISTS (SELECT 1 FROM "LabTemplateVersion" WHERE id = NEW."versionId" AND status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'Published lab steps are immutable' USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER lab_steps_immutable BEFORE INSERT OR UPDATE OR DELETE ON "LabStep"
FOR EACH ROW EXECUTE FUNCTION public.lab_protect_published_steps();

CREATE FUNCTION public.lab_protect_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Submitted lab history is immutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER lab_submission_immutable BEFORE UPDATE OR DELETE ON "LabSubmission"
FOR EACH ROW EXECUTE FUNCTION public.lab_protect_history();
CREATE TRIGGER lab_review_immutable BEFORE UPDATE OR DELETE ON "LabReview"
FOR EACH ROW EXECUTE FUNCTION public.lab_protect_history();
CREATE TRIGGER lab_submission_evidence_immutable BEFORE UPDATE OR DELETE ON "LabSubmissionEvidence"
FOR EACH ROW EXECUTE FUNCTION public.lab_protect_history();

CREATE FUNCTION public.lab_validate_assignment() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW."syllabusItemId", NEW."courseId", NEW."versionId") IS DISTINCT FROM (OLD."syllabusItemId", OLD."courseId", OLD."versionId") THEN
    RAISE EXCEPTION 'An assigned lab version cannot be replaced' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "LabTemplateVersion" v
    JOIN "LabTemplate" t ON t.id = v."templateId"
    JOIN "Course" c ON c.id = NEW."courseId"
    JOIN "Institute" i ON i.id = c."instituteId"
    WHERE v.id = NEW."versionId" AND v.status = 'PUBLISHED'
      AND t."instituteId" = c."instituteId" AND lower(i.code) = 'ics'
  ) OR EXISTS (SELECT 1 FROM "Form" WHERE "syllabusItemId" = NEW."syllabusItemId")
     OR EXISTS (SELECT 1 FROM "ActivityTemplate" WHERE "syllabusItemId" = NEW."syllabusItemId") THEN
    RAISE EXCEPTION 'Lab must use a published ICS version and exclusive task format' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER lab_assignment_valid BEFORE INSERT OR UPDATE ON "LabAssignment"
FOR EACH ROW EXECUTE FUNCTION public.lab_validate_assignment();

ALTER TABLE "LabAttempt" ADD CONSTRAINT "LabAttempt_first_attempt" CHECK ("attemptNumber" = 1);
ALTER TABLE "LabAttempt" ADD CONSTRAINT "LabAttempt_score_nonnegative" CHECK (score IS NULL OR score >= 0);
ALTER TABLE "LabReview" ADD CONSTRAINT "LabReview_score_nonnegative" CHECK (score IS NULL OR score >= 0);
ALTER TABLE "LabStep" ADD CONSTRAINT "LabStep_config_object" CHECK (jsonb_typeof(config) = 'object');
ALTER TABLE "LabTemplateVersion" ADD CONSTRAINT "LabVersion_duration_positive" CHECK ("estimatedMinutes" > 0);

-- Match the existing restricted deployment principal; never grant schema CREATE,
-- ownership, PUBLIC access, or the owner's credentials to the web application.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."LabTemplate", public."LabTemplateVersion", public."LabStep",
      public."LabAssignment", public."LabAttempt", public."LabStepResponse",
      public."LabSubmission", public."LabEvidence", public."LabSubmissionEvidence", public."LabReview"
      TO lms_web_runtime_v1;
    GRANT SELECT, INSERT ON TABLE public."SubmissionRequest" TO lms_web_runtime_v1;
  END IF;
END;
$$;
