-- Mock Interview AI evaluation (additive only; no drops, no data rewrites).
-- Safe to run on an existing database: old application code keeps working because
-- every new column is nullable and the new table is only used by the AI feature.

-- AlterTable
ALTER TABLE "MockInterviewApplicantAttempt"
  ADD COLUMN IF NOT EXISTS "aiScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "aiRating" TEXT,
  ADD COLUMN IF NOT EXISTS "aiFeedback" JSONB,
  ADD COLUMN IF NOT EXISTS "aiProvider" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MockInterviewAiRequest" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MockInterviewAiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MockInterviewAiRequest_studentId_createdAt_idx"
  ON "MockInterviewAiRequest"("studentId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewAiRequest_studentId_fkey') THEN
    ALTER TABLE "MockInterviewAiRequest"
      ADD CONSTRAINT "MockInterviewAiRequest_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Recovery (manual, only if you must roll back; AI data would be lost):
--   DROP TABLE IF EXISTS "MockInterviewAiRequest";
--   ALTER TABLE "MockInterviewApplicantAttempt"
--     DROP COLUMN IF EXISTS "aiScore", DROP COLUMN IF EXISTS "aiRating",
--     DROP COLUMN IF EXISTS "aiFeedback", DROP COLUMN IF EXISTS "aiProvider";

