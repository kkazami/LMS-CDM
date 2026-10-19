-- Migration: 20261020120000_ite_practicum
-- Additive only: creates the Practicum enums, tables, indexes and foreign keys for ITE student teaching.
-- Touches only the new Practicum objects; no existing table, column, type or index is changed.

-- CreateEnum
CREATE TYPE "PracticumPlacementStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PracticumSubmissionType" AS ENUM ('LESSON_PLAN', 'DEMO_VIDEO', 'PORTFOLIO_EVIDENCE');

-- CreateEnum
CREATE TYPE "PracticumSubmissionStatus" AS ENUM ('SUBMITTED', 'NEEDS_REVISION', 'APPROVED');

-- CreateEnum
CREATE TYPE "PracticumDecision" AS ENUM ('COMMENT', 'NEEDS_REVISION', 'APPROVED');

-- CreateTable
CREATE TABLE "PracticumPlacement" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PracticumPlacementStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticumPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticumSubmission" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "type" "PracticumSubmissionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "videoLink" TEXT,
    "status" "PracticumSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticumSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticumFeedback" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "decision" "PracticumDecision" NOT NULL DEFAULT 'COMMENT',
    "score" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticumFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PracticumPlacement_supervisorId_status_idx" ON "PracticumPlacement"("supervisorId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PracticumPlacement_studentId_schoolYear_key" ON "PracticumPlacement"("studentId", "schoolYear");

-- CreateIndex
CREATE INDEX "PracticumSubmission_placementId_type_idx" ON "PracticumSubmission"("placementId", "type");

-- CreateIndex
CREATE INDEX "PracticumSubmission_placementId_status_idx" ON "PracticumSubmission"("placementId", "status");

-- CreateIndex
CREATE INDEX "PracticumSubmission_status_idx" ON "PracticumSubmission"("status");

-- CreateIndex
CREATE INDEX "PracticumFeedback_submissionId_createdAt_idx" ON "PracticumFeedback"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "PracticumFeedback_authorId_idx" ON "PracticumFeedback"("authorId");

-- AddForeignKey
ALTER TABLE "PracticumPlacement" ADD CONSTRAINT "PracticumPlacement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticumPlacement" ADD CONSTRAINT "PracticumPlacement_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticumSubmission" ADD CONSTRAINT "PracticumSubmission_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "PracticumPlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticumFeedback" ADD CONSTRAINT "PracticumFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "PracticumSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticumFeedback" ADD CONSTRAINT "PracticumFeedback_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
