-- Migration: 20261016030000_ite_participation_tracker
-- Additive only: creates ActivityEventType, RiskLevel enums, ActivityEvent and RiskAssessment tables, indexes, and foreign keys.

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('LOGIN', 'COURSE_VIEW', 'MATERIAL_VIEW', 'TASK_SUBMITTED', 'QUIZ_ATTEMPT', 'FLASHCARD_REVIEW', 'MEETING_JOIN', 'ANNOUNCEMENT_READ');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "type" "ActivityEventType" NOT NULL,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "level" "RiskLevel" NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "engagementScore" INTEGER NOT NULL,
    "reasons" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAlertedAt" TIMESTAMP(3),
    "lastAlertedLevel" "RiskLevel",

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_createdAt_idx" ON "ActivityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_courseId_createdAt_idx" ON "ActivityEvent"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_userId_courseId_type_refId_idx" ON "ActivityEvent"("userId", "courseId", "type", "refId");

-- CreateIndex
CREATE INDEX "RiskAssessment_courseId_level_idx" ON "RiskAssessment"("courseId", "level");

-- CreateIndex
CREATE INDEX "RiskAssessment_studentId_idx" ON "RiskAssessment"("studentId");

-- CreateIndex
CREATE INDEX "RiskAssessment_computedAt_idx" ON "RiskAssessment"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RiskAssessment_studentId_courseId_key" ON "RiskAssessment"("studentId", "courseId");

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
