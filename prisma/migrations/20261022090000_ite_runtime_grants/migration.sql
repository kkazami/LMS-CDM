-- The restricted application runtime role (lms_web_runtime_v1) has no default privileges
-- on tables created by migrations under the database owner. Each migration creating
-- ITE tables requires an explicit grant so the restricted role has table privileges.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."AiGuidanceRequest",
      public."ClassMeeting",
      public."FocusSession",
      public."MeetingJoin",
      public."PracticumFeedback",
      public."PracticumPlacement",
      public."PracticumSubmission",
      public."ActivityEvent",
      public."RiskAssessment"
    TO lms_web_runtime_v1';
  END IF;
END $$;
