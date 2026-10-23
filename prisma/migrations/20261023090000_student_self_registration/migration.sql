-- Google uses its stable subject identifier for subsequent logins.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleSubject" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleSubject_key" ON "User"("googleSubject");
