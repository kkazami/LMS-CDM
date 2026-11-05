-- AlterTable: add nullable idempotencyKey to PracticumSubmission (unique per placement/student)
ALTER TABLE "PracticumSubmission" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PracticumSubmission_placementId_idempotencyKey_key"
ON "PracticumSubmission"("placementId", "idempotencyKey");

