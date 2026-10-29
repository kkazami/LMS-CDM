-- IBE Student Learning Hub — Direct External Courses and Certificates (IBE student-only)

CREATE TABLE IF NOT EXISTS "IbeLearningRecord" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "IbeLearningRecord_studentId_courseId_key" ON "IbeLearningRecord"("studentId", "courseId");
CREATE INDEX IF NOT EXISTS "IbeLearningRecord_studentId_status_idx" ON "IbeLearningRecord"("studentId", "status");
CREATE INDEX IF NOT EXISTS "IbeLearningRecord_studentId_updatedAt_idx" ON "IbeLearningRecord"("studentId", "updatedAt");
CREATE INDEX IF NOT EXISTS "IbeLearningRecord_instituteId_idx" ON "IbeLearningRecord"("instituteId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IbeLearningRecord_studentId_fkey') THEN
    ALTER TABLE "IbeLearningRecord" ADD CONSTRAINT "IbeLearningRecord_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IbeLearningRecord_instituteId_fkey') THEN
    ALTER TABLE "IbeLearningRecord" ADD CONSTRAINT "IbeLearningRecord_instituteId_fkey"
      FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "IbeLearningRecord" TO lms_web_runtime_v1;
  END IF;
END
$$;

