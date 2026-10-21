-- Expire pre-rollout sessions without UPDATEs that privileged admission guards reject.
-- New sessions use the current time; existing credentials and session fields are untouched.
ALTER TABLE "Session" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT TIMESTAMP '1970-01-01 00:00:00';
ALTER TABLE "Session" ALTER COLUMN "lastSeenAt" SET DEFAULT CURRENT_TIMESTAMP;
