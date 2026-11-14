-- CreateTable
CREATE TABLE "IteLectureVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "courseId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'UPLOAD',
    "externalVideoId" TEXT,
    "externalUrl" TEXT,
    "storageUrl" TEXT,
    "storagePathname" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IteLectureVideo_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "IteLectureVideo_sourceType_check" CHECK ("sourceType" IN ('UPLOAD', 'YOUTUBE', 'DRIVE')),
    CONSTRAINT "IteLectureVideo_source_fields_check" CHECK (
        ("sourceType" = 'UPLOAD' AND "storageUrl" IS NOT NULL AND "storagePathname" IS NOT NULL AND "fileName" IS NOT NULL AND "mimeType" IS NOT NULL AND "fileSize" IS NOT NULL AND "externalVideoId" IS NULL)
        OR ("sourceType" IN ('YOUTUBE', 'DRIVE') AND "externalVideoId" IS NOT NULL)
    )
);

-- CreateTable
CREATE TABLE "IteLectureVideoProgress" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "lastPositionSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "watchedSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "durationSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IteLectureVideoProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IteLectureVideo_courseId_idx" ON "IteLectureVideo"("courseId");

-- CreateIndex
CREATE INDEX "IteLectureVideo_createdAt_idx" ON "IteLectureVideo"("createdAt");

-- CreateIndex
CREATE INDEX "IteLectureVideo_uploadedById_idx" ON "IteLectureVideo"("uploadedById");

-- CreateIndex
CREATE UNIQUE INDEX "IteLectureVideoProgress_lectureId_studentId_key" ON "IteLectureVideoProgress"("lectureId", "studentId");

-- CreateIndex
CREATE INDEX "IteLectureVideoProgress_lectureId_lastWatchedAt_idx" ON "IteLectureVideoProgress"("lectureId", "lastWatchedAt");

-- CreateIndex
CREATE INDEX "IteLectureVideoProgress_studentId_idx" ON "IteLectureVideoProgress"("studentId");

-- AddForeignKey
ALTER TABLE "IteLectureVideo" ADD CONSTRAINT "IteLectureVideo_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IteLectureVideo" ADD CONSTRAINT "IteLectureVideo_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IteLectureVideoProgress" ADD CONSTRAINT "IteLectureVideoProgress_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "IteLectureVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IteLectureVideoProgress" ADD CONSTRAINT "IteLectureVideoProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Grant runtime table privileges to restricted application role when present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."IteLectureVideo",
      public."IteLectureVideoProgress"
    TO lms_web_runtime_v1';
  END IF;
END $$;

