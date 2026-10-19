ALTER TABLE "Course"
  ADD COLUMN "scheduleStartDate" DATE,
  ADD COLUMN "scheduleEndDate" DATE,
  ADD CONSTRAINT "Course_schedule_date_range_check" CHECK (
    ("scheduleStartDate" IS NULL AND "scheduleEndDate" IS NULL)
    OR ("scheduleStartDate" IS NOT NULL AND "scheduleEndDate" IS NOT NULL
      AND "scheduleEndDate" >= "scheduleStartDate")
  );
