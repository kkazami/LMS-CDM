-- Migration: 20261020140000_ite_ai_guidance
-- Additive only: creates the AiGuidanceRequest table, indexes, and foreign keys for ITE AI-assisted guidance.
-- Touches only the new AiGuidanceRequest objects; no existing table, column, type, or index is changed.

-- CreateTable
CREATE TABLE "AiGuidanceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "materialId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'MATERIAL_HELP',
    "status" TEXT NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGuidanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiGuidanceRequest_userId_createdAt_idx" ON "AiGuidanceRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiGuidanceRequest_courseId_createdAt_idx" ON "AiGuidanceRequest"("courseId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiGuidanceRequest" ADD CONSTRAINT "AiGuidanceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiGuidanceRequest" ADD CONSTRAINT "AiGuidanceRequest_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
