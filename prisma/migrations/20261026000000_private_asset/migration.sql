-- CreateTable PrivateAsset & LegacyAssetBinding
CREATE TABLE IF NOT EXISTS "PrivateAsset" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "content" BYTEA NOT NULL,
    "scanStatus" TEXT NOT NULL DEFAULT 'LEGACY',
    "sha256" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrivateAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PrivateAsset_instituteId_ownerId_idx" ON "PrivateAsset"("instituteId", "ownerId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'PrivateAsset' AND constraint_name = 'PrivateAsset_ownerId_instituteId_fkey'
  ) THEN
    ALTER TABLE "PrivateAsset" ADD CONSTRAINT "PrivateAsset_ownerId_instituteId_fkey" 
      FOREIGN KEY ("ownerId", "instituteId") REFERENCES "User"("id", "instituteId") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "LegacyAssetBinding" (
    "kind" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "instituteId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "courseId" TEXT,

    CONSTRAINT "LegacyAssetBinding_pkey" PRIMARY KEY ("kind", "sourceId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LegacyAssetBinding_url_instituteId_idx" ON "LegacyAssetBinding"("url", "instituteId");

-- Runtime Role Grants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."PrivateAsset",
      public."LegacyAssetBinding"
    TO lms_web_runtime_v1';
  END IF;
END $$;
