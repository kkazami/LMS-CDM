ALTER TABLE "Course"
  ADD COLUMN "scheduleDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN "scheduleStart" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "scheduleEnd" TEXT NOT NULL DEFAULT '';

ALTER TABLE "CalendarEvent" ADD COLUMN "endDate" TIMESTAMP(3);

ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_endDate_check"
  CHECK ("endDate" IS NULL OR "endDate" > "eventDate");
