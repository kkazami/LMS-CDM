-- Migration: 20261026120000_support_tickets
-- Additive only: creates SupportTicket table for the help desk & support ticket system, indexes, and foreign keys.

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "authorId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- Ensure all columns exist if the table was previously created with a different schema
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'GENERAL';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "authorId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "instituteId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_authorId_idx" ON "SupportTicket"("authorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_instituteId_idx" ON "SupportTicket"("instituteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicket_authorId_fkey'
    ) THEN
        ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SupportTicket_instituteId_fkey'
    ) THEN
        ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
