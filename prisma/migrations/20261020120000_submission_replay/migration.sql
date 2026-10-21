CREATE TABLE "SubmissionRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "response" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SubmissionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SubmissionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "SubmissionRequest_userId_idx" ON "SubmissionRequest"("userId");
ALTER TABLE "ExpTransaction" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "ExpTransaction_userId_idempotencyKey_key" ON "ExpTransaction"("userId", "idempotencyKey");
