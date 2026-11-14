-- CreateTable
CREATE TABLE IF NOT EXISTS "PracticumLessonPlanFile" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticumLessonPlanFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PracticumLessonPlanFile_lessonPlanId_key" ON "PracticumLessonPlanFile"("lessonPlanId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PracticumLessonPlanFile_uploadedById_idx" ON "PracticumLessonPlanFile"("uploadedById");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PracticumLessonPlanFile_lessonPlanId_idx" ON "PracticumLessonPlanFile"("lessonPlanId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PracticumLessonPlanFile_uploadedById_fkey'
    ) THEN
        ALTER TABLE "PracticumLessonPlanFile" ADD CONSTRAINT "PracticumLessonPlanFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PracticumLessonPlanFile_lessonPlanId_fkey'
    ) THEN
        ALTER TABLE "PracticumLessonPlanFile" ADD CONSTRAINT "PracticumLessonPlanFile_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "PracticumSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Grant runtime table privileges to restricted application role when present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."PracticumLessonPlanFile" TO lms_web_runtime_v1';
    END IF;
END $$;

