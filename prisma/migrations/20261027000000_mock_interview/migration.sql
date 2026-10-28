-- CreateTable: MockInterviewQuestion
CREATE TABLE IF NOT EXISTS "MockInterviewQuestion" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'ENTRY',
    "questionText" TEXT NOT NULL,
    "jobPosition" TEXT NOT NULL DEFAULT '',
    "situation" TEXT,
    "modelAnswer" TEXT NOT NULL,
    "interviewTip" TEXT NOT NULL,
    "evaluationCriteria" JSONB NOT NULL DEFAULT '[]',
    "competency" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterviewRecruiterScenario
CREATE TABLE IF NOT EXISTS "MockInterviewRecruiterScenario" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "roleOrPosition" TEXT NOT NULL DEFAULT '',
    "context" TEXT NOT NULL,
    "questionOptions" JSONB NOT NULL DEFAULT '[]',
    "applicantAnswers" JSONB NOT NULL DEFAULT '{}',
    "followUpOptions" JSONB NOT NULL DEFAULT '[]',
    "practicalAdvice" TEXT NOT NULL,
    "competency" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewRecruiterScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterviewQuizQuestion
CREATE TABLE IF NOT EXISTS "MockInterviewQuizQuestion" (
    "id" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "choices" JSONB NOT NULL DEFAULT '[]',
    "correctAnswer" INTEGER NOT NULL DEFAULT 0,
    "explanation" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'ENTRY',
    "pointValue" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewQuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterviewSavedQuestion
CREATE TABLE IF NOT EXISTS "MockInterviewSavedQuestion" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewSavedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterviewApplicantAttempt
CREATE TABLE IF NOT EXISTS "MockInterviewApplicantAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "writtenAnswer" TEXT NOT NULL,
    "checklistAssessment" JSONB NOT NULL DEFAULT '{}',
    "feedbackNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewApplicantAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterviewRecruiterAttempt
CREATE TABLE IF NOT EXISTS "MockInterviewRecruiterAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "selectedQuestionId" TEXT NOT NULL,
    "classifiedAnswer" TEXT NOT NULL,
    "selectedFollowUpId" TEXT,
    "isQuestionCorrect" BOOLEAN NOT NULL DEFAULT false,
    "isClassificationCorrect" BOOLEAN NOT NULL DEFAULT false,
    "isFollowUpCorrect" BOOLEAN,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 100,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewRecruiterAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MockInterviewQuizAttempt
CREATE TABLE IF NOT EXISTS "MockInterviewQuizAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 180,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "userAnswers" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- Indices
CREATE INDEX IF NOT EXISTS "MockInterviewQuestion_category_idx" ON "MockInterviewQuestion"("category");
CREATE INDEX IF NOT EXISTS "MockInterviewQuestion_difficulty_idx" ON "MockInterviewQuestion"("difficulty");

CREATE INDEX IF NOT EXISTS "MockInterviewRecruiterScenario_category_idx" ON "MockInterviewRecruiterScenario"("category");
CREATE INDEX IF NOT EXISTS "MockInterviewQuizQuestion_category_idx" ON "MockInterviewQuizQuestion"("category");

CREATE UNIQUE INDEX IF NOT EXISTS "MockInterviewSavedQuestion_studentId_questionId_key" ON "MockInterviewSavedQuestion"("studentId", "questionId");
CREATE INDEX IF NOT EXISTS "MockInterviewSavedQuestion_studentId_idx" ON "MockInterviewSavedQuestion"("studentId");
CREATE INDEX IF NOT EXISTS "MockInterviewSavedQuestion_questionId_idx" ON "MockInterviewSavedQuestion"("questionId");

CREATE INDEX IF NOT EXISTS "MockInterviewApplicantAttempt_studentId_createdAt_idx" ON "MockInterviewApplicantAttempt"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "MockInterviewApplicantAttempt_questionId_idx" ON "MockInterviewApplicantAttempt"("questionId");

CREATE INDEX IF NOT EXISTS "MockInterviewRecruiterAttempt_studentId_completedAt_idx" ON "MockInterviewRecruiterAttempt"("studentId", "completedAt");
CREATE INDEX IF NOT EXISTS "MockInterviewRecruiterAttempt_scenarioId_idx" ON "MockInterviewRecruiterAttempt"("scenarioId");

CREATE INDEX IF NOT EXISTS "MockInterviewQuizAttempt_studentId_completedAt_idx" ON "MockInterviewQuizAttempt"("studentId", "completedAt");

-- Foreign Keys with DO block
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewSavedQuestion_studentId_fkey'
    ) THEN
        ALTER TABLE "MockInterviewSavedQuestion" ADD CONSTRAINT "MockInterviewSavedQuestion_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewSavedQuestion_questionId_fkey'
    ) THEN
        ALTER TABLE "MockInterviewSavedQuestion" ADD CONSTRAINT "MockInterviewSavedQuestion_questionId_fkey"
            FOREIGN KEY ("questionId") REFERENCES "MockInterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewApplicantAttempt_studentId_fkey'
    ) THEN
        ALTER TABLE "MockInterviewApplicantAttempt" ADD CONSTRAINT "MockInterviewApplicantAttempt_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewApplicantAttempt_questionId_fkey'
    ) THEN
        ALTER TABLE "MockInterviewApplicantAttempt" ADD CONSTRAINT "MockInterviewApplicantAttempt_questionId_fkey"
            FOREIGN KEY ("questionId") REFERENCES "MockInterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewRecruiterAttempt_studentId_fkey'
    ) THEN
        ALTER TABLE "MockInterviewRecruiterAttempt" ADD CONSTRAINT "MockInterviewRecruiterAttempt_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewRecruiterAttempt_scenarioId_fkey'
    ) THEN
        ALTER TABLE "MockInterviewRecruiterAttempt" ADD CONSTRAINT "MockInterviewRecruiterAttempt_scenarioId_fkey"
            FOREIGN KEY ("scenarioId") REFERENCES "MockInterviewRecruiterScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewQuizAttempt_studentId_fkey'
    ) THEN
        ALTER TABLE "MockInterviewQuizAttempt" ADD CONSTRAINT "MockInterviewQuizAttempt_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Optional runtime role grants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."MockInterviewQuestion",
      public."MockInterviewRecruiterScenario",
      public."MockInterviewQuizQuestion",
      public."MockInterviewSavedQuestion",
      public."MockInterviewApplicantAttempt",
      public."MockInterviewRecruiterAttempt",
      public."MockInterviewQuizAttempt",
      public."FinancialStatement"
    TO lms_web_runtime_v1';
  END IF;
END $$;
