-- CreateTable
CREATE TABLE IF NOT EXISTS "IctPlaygroundProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "css" TEXT NOT NULL,
    "js" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IctPlaygroundProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IctPlaygroundProject_userId_updatedAt_idx" ON "IctPlaygroundProject"("userId", "updatedAt");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'IctPlaygroundProject_userId_fkey'
    ) THEN
        ALTER TABLE "IctPlaygroundProject" ADD CONSTRAINT "IctPlaygroundProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Grant runtime table privileges to restricted application role when present
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."IctPlaygroundProject" TO lms_web_runtime_v1';
    END IF;
END $$;

