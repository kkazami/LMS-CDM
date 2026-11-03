BEGIN;

CREATE TABLE "OhmwardLearner" (
  "studentId" TEXT NOT NULL PRIMARY KEY, "instituteId" TEXT NOT NULL,
  "primerCompletedAt" TIMESTAMP(3), "lastLevelId" TEXT, "sandbox" JSONB,
  "sandboxRevision" INTEGER NOT NULL DEFAULT 0 CHECK ("sandboxRevision" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OhmwardLearner_studentId_instituteId_fkey" FOREIGN KEY ("studentId", "instituteId") REFERENCES "User"("id", "instituteId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OhmwardLearner_studentId_instituteId_key" ON "OhmwardLearner"("studentId", "instituteId");
CREATE INDEX "OhmwardLearner_instituteId_idx" ON "OhmwardLearner"("instituteId");
CREATE TABLE "OhmwardAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY, "studentId" TEXT NOT NULL, "instituteId" TEXT NOT NULL,
  "levelId" TEXT NOT NULL, "contentVersion" INTEGER NOT NULL CHECK ("contentVersion" > 0), "variantId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK ("status" IN ('IN_PROGRESS','SUBMITTED','ABANDONED')),
  "revision" INTEGER NOT NULL DEFAULT 0 CHECK ("revision" >= 0), "state" JSONB NOT NULL, "hintIds" JSONB NOT NULL DEFAULT '[]', "result" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "submittedAt" TIMESTAMP(3),
  CONSTRAINT "OhmwardAttempt_learner_fkey" FOREIGN KEY ("studentId", "instituteId") REFERENCES "OhmwardLearner"("studentId", "instituteId") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OhmwardAttempt_finalization_check" CHECK (("status"='SUBMITTED' AND "result" IS NOT NULL AND "submittedAt" IS NOT NULL) OR ("status"<>'SUBMITTED' AND "result" IS NULL AND "submittedAt" IS NULL))
);
CREATE INDEX "OhmwardAttempt_studentId_levelId_startedAt_idx" ON "OhmwardAttempt"("studentId", "levelId", "startedAt");
CREATE INDEX "OhmwardAttempt_instituteId_submittedAt_idx" ON "OhmwardAttempt"("instituteId", "submittedAt");
CREATE UNIQUE INDEX "OhmwardAttempt_one_active" ON "OhmwardAttempt"("studentId", "levelId") WHERE "status"='IN_PROGRESS';
CREATE TABLE "OhmwardProgress" (
  "studentId" TEXT NOT NULL, "instituteId" TEXT NOT NULL, "levelId" TEXT NOT NULL,
  "bestScore" DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK ("bestScore" >= 0 AND "bestScore" <= 100),
  "bestStars" INTEGER NOT NULL DEFAULT 0 CHECK ("bestStars" BETWEEN 0 AND 3), "firstPassedAt" TIMESTAMP(3),
  "lastSubmittedAt" TIMESTAMP(3) NOT NULL, "submittedCount" INTEGER NOT NULL DEFAULT 0 CHECK ("submittedCount" >= 0),
  PRIMARY KEY ("studentId", "levelId"),
  CONSTRAINT "OhmwardProgress_learner_fkey" FOREIGN KEY ("studentId", "instituteId") REFERENCES "OhmwardLearner"("studentId", "instituteId") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OhmwardProgress_instituteId_firstPassedAt_idx" ON "OhmwardProgress"("instituteId", "firstPassedAt");
CREATE FUNCTION ohmward_immutable_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" <> 'IN_PROGRESS' THEN RAISE EXCEPTION 'Final Ohmward attempts are immutable'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "OhmwardAttempt_immutable" BEFORE UPDATE ON "OhmwardAttempt" FOR EACH ROW EXECUTE FUNCTION ohmward_immutable_attempt();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lms_web_runtime_v1') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "OhmwardLearner", "OhmwardAttempt", "OhmwardProgress" TO lms_web_runtime_v1;
  END IF;
END $$;

COMMIT;
