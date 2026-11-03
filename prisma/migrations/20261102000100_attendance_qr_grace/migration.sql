BEGIN;

ALTER TABLE "AttendanceSession" ALTER COLUMN "qrGraceSeconds" SET DEFAULT 30;
ALTER TABLE "AttendanceSession" DROP CONSTRAINT "AttendanceSession_timing";
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_timing" CHECK ("closesAt" > "opensAt" AND "presentUntil" >= "opensAt" AND "presentUntil" <= "closesAt" AND "qrGraceSeconds" BETWEEN 3 AND 60 AND "radius" BETWEEN 100 AND 500 AND (NOT "requiresLocation" OR ("mode" = 'IN_PERSON' AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL)) AND (NOT "liveCodeEnabled" OR "mode" = 'LIVE_REMOTE'));

COMMIT;
