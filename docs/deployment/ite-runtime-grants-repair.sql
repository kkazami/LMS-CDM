-- Run as the database owner on the verified LMS database.
-- Same nine-table grant as merged migration 20261022090000_ite_runtime_grants.
-- Repeatable; does not change records, schema creation rights, roles, or security guards.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."AiGuidanceRequest",
  public."ClassMeeting",
  public."FocusSession",
  public."MeetingJoin",
  public."PracticumFeedback",
  public."PracticumPlacement",
  public."PracticumSubmission",
  public."ActivityEvent",
  public."RiskAssessment"
TO lms_web_runtime_v1;

COMMIT;
