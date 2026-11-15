-- AlterTable: add nullable rubric file metadata fields to PracticumPlacement
ALTER TABLE "PracticumPlacement"
  ADD COLUMN IF NOT EXISTS "rubricStorageKey" TEXT,
  ADD COLUMN IF NOT EXISTS "rubricFileName" TEXT,
  ADD COLUMN IF NOT EXISTS "rubricMimeType" TEXT,
  ADD COLUMN IF NOT EXISTS "rubricFileSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "rubricUploadedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rubricUploadedById" TEXT;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PracticumPlacement_rubricUploadedById_fkey'
    ) THEN
        ALTER TABLE "PracticumPlacement"
            ADD CONSTRAINT "PracticumPlacement_rubricUploadedById_fkey"
            FOREIGN KEY ("rubricUploadedById") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

