-- CreateTable
CREATE TABLE "FinancialStatement" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "statementType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "businessName" TEXT NOT NULL DEFAULT '',
    "periodStart" DATE,
    "periodEnd" DATE,
    "data" JSONB NOT NULL,
    "results" JSONB,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialStatement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialStatement_studentId_status_idx" ON "FinancialStatement"("studentId", "status");

-- CreateIndex
CREATE INDEX "FinancialStatement_studentId_updatedAt_idx" ON "FinancialStatement"("studentId", "updatedAt");

-- CreateIndex
CREATE INDEX "FinancialStatement_instituteId_idx" ON "FinancialStatement"("instituteId");

-- AddForeignKey
ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Integrity checks (additive only; no existing data is touched)
ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_status_check"
  CHECK ("status" IN ('DRAFT', 'GENERATED'));

ALTER TABLE "FinancialStatement" ADD CONSTRAINT "FinancialStatement_period_check"
  CHECK ("periodStart" IS NULL OR "periodEnd" IS NULL OR "periodStart" <= "periodEnd");
