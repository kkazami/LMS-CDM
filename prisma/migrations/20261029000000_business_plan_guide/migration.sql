-- Business Plan Guide and Builder (IBE student-only)

CREATE TABLE IF NOT EXISTS "BusinessPlan" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Business Plan',
    "documentType" TEXT NOT NULL DEFAULT 'BUSINESS_PLAN',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "businessCategory" TEXT NOT NULL DEFAULT 'FOOD_BEVERAGE',
    "data" JSONB NOT NULL,
    "templateId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BusinessPlan_studentId_status_idx" ON "BusinessPlan"("studentId", "status");
CREATE INDEX IF NOT EXISTS "BusinessPlan_studentId_updatedAt_idx" ON "BusinessPlan"("studentId", "updatedAt");
CREATE INDEX IF NOT EXISTS "BusinessPlan_instituteId_idx" ON "BusinessPlan"("instituteId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessPlan_studentId_fkey') THEN
    ALTER TABLE "BusinessPlan" ADD CONSTRAINT "BusinessPlan_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BusinessPlan_instituteId_fkey') THEN
    ALTER TABLE "BusinessPlan" ADD CONSTRAINT "BusinessPlan_instituteId_fkey"
      FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "BusinessPlan" TO lms_web_runtime_v1;
  END IF;
END
$$;

