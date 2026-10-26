-- Migration: 20261025000000_quiz_arena
-- Additive only: creates Quiz Arena tables (ArenaQuiz, ArenaQuestion, ArenaAnswerChoice, ArenaGameSession, ArenaParticipant, ArenaPlayerAnswer), indexes, and foreign keys.

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaQuiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImage" TEXT,
    "courseId" TEXT,
    "instituteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "defaultTimeLimitSeconds" INTEGER NOT NULL DEFAULT 20,
    "scoringMethod" TEXT NOT NULL DEFAULT 'SPEED_BASED',
    "enableIntegrityMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
    "shuffleAnswers" BOOLEAN NOT NULL DEFAULT false,
    "showLeaderboardAfterEach" BOOLEAN NOT NULL DEFAULT true,
    "showAnswerFeedback" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "allowReconnection" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaQuiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaQuestion" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "mediaUrl" TEXT,
    "timeLimitSeconds" INTEGER NOT NULL DEFAULT 20,
    "basePoints" INTEGER NOT NULL DEFAULT 1000,
    "speedBonusEnabled" BOOLEAN NOT NULL DEFAULT true,
    "explanation" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaAnswerChoice" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "choiceText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "colorIndex" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArenaAnswerChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaGameSession" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'LIVE',
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionStartedAt" TIMESTAMP(3),
    "currentQuestionDeadline" TIMESTAMP(3),
    "scoringMethod" TEXT NOT NULL DEFAULT 'SPEED_BASED',
    "enableIntegrityMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "showLeaderboardAfterEach" BOOLEAN NOT NULL DEFAULT true,
    "showAnswerFeedback" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaGameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ArenaPlayerAnswer" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "choiceId" TEXT,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "responseTimeMs" INTEGER NOT NULL DEFAULT 0,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "integrityFlags" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArenaPlayerAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaQuiz_instituteId_idx" ON "ArenaQuiz"("instituteId");
CREATE INDEX IF NOT EXISTS "ArenaQuiz_authorId_idx" ON "ArenaQuiz"("authorId");
CREATE INDEX IF NOT EXISTS "ArenaQuiz_courseId_idx" ON "ArenaQuiz"("courseId");
CREATE INDEX IF NOT EXISTS "ArenaQuiz_status_idx" ON "ArenaQuiz"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaQuestion_quizId_orderIndex_idx" ON "ArenaQuestion"("quizId", "orderIndex");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ArenaAnswerChoice_questionId_orderIndex_idx" ON "ArenaAnswerChoice"("questionId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaGameSession_pin_key" ON "ArenaGameSession"("pin");
CREATE INDEX IF NOT EXISTS "ArenaGameSession_pin_idx" ON "ArenaGameSession"("pin");
CREATE INDEX IF NOT EXISTS "ArenaGameSession_quizId_idx" ON "ArenaGameSession"("quizId");
CREATE INDEX IF NOT EXISTS "ArenaGameSession_hostId_idx" ON "ArenaGameSession"("hostId");
CREATE INDEX IF NOT EXISTS "ArenaGameSession_status_idx" ON "ArenaGameSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaParticipant_sessionId_studentId_key" ON "ArenaParticipant"("sessionId", "studentId");
CREATE INDEX IF NOT EXISTS "ArenaParticipant_sessionId_score_idx" ON "ArenaParticipant"("sessionId", "score");
CREATE INDEX IF NOT EXISTS "ArenaParticipant_studentId_idx" ON "ArenaParticipant"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ArenaPlayerAnswer_sessionId_questionId_studentId_key" ON "ArenaPlayerAnswer"("sessionId", "questionId", "studentId");
CREATE INDEX IF NOT EXISTS "ArenaPlayerAnswer_sessionId_questionId_idx" ON "ArenaPlayerAnswer"("sessionId", "questionId");
CREATE INDEX IF NOT EXISTS "ArenaPlayerAnswer_participantId_idx" ON "ArenaPlayerAnswer"("participantId");
CREATE INDEX IF NOT EXISTS "ArenaPlayerAnswer_studentId_idx" ON "ArenaPlayerAnswer"("studentId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaQuiz_instituteId_fkey') THEN
    ALTER TABLE "ArenaQuiz" ADD CONSTRAINT "ArenaQuiz_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaQuiz_authorId_fkey') THEN
    ALTER TABLE "ArenaQuiz" ADD CONSTRAINT "ArenaQuiz_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaQuiz_courseId_fkey') THEN
    ALTER TABLE "ArenaQuiz" ADD CONSTRAINT "ArenaQuiz_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaQuestion_quizId_fkey') THEN
    ALTER TABLE "ArenaQuestion" ADD CONSTRAINT "ArenaQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "ArenaQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaAnswerChoice_questionId_fkey') THEN
    ALTER TABLE "ArenaAnswerChoice" ADD CONSTRAINT "ArenaAnswerChoice_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ArenaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaGameSession_quizId_fkey') THEN
    ALTER TABLE "ArenaGameSession" ADD CONSTRAINT "ArenaGameSession_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "ArenaQuiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaGameSession_hostId_fkey') THEN
    ALTER TABLE "ArenaGameSession" ADD CONSTRAINT "ArenaGameSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaParticipant_sessionId_fkey') THEN
    ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ArenaGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaParticipant_studentId_fkey') THEN
    ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaPlayerAnswer_sessionId_fkey') THEN
    ALTER TABLE "ArenaPlayerAnswer" ADD CONSTRAINT "ArenaPlayerAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ArenaGameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaPlayerAnswer_questionId_fkey') THEN
    ALTER TABLE "ArenaPlayerAnswer" ADD CONSTRAINT "ArenaPlayerAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ArenaQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaPlayerAnswer_choiceId_fkey') THEN
    ALTER TABLE "ArenaPlayerAnswer" ADD CONSTRAINT "ArenaPlayerAnswer_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "ArenaAnswerChoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaPlayerAnswer_participantId_fkey') THEN
    ALTER TABLE "ArenaPlayerAnswer" ADD CONSTRAINT "ArenaPlayerAnswer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "ArenaParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ArenaPlayerAnswer_studentId_fkey') THEN
    ALTER TABLE "ArenaPlayerAnswer" ADD CONSTRAINT "ArenaPlayerAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Optional runtime role grants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."ArenaQuiz",
      public."ArenaQuestion",
      public."ArenaAnswerChoice",
      public."ArenaGameSession",
      public."ArenaParticipant",
      public."ArenaPlayerAnswer"
    TO lms_web_runtime_v1';
  END IF;
END $$;
