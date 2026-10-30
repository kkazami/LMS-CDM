import { db } from "@/lib/db";
import {
  PREDEFINED_QUESTIONS,
  PREDEFINED_SCENARIOS,
  PREDEFINED_QUIZ_QUESTIONS,
} from "./content-bank";

/**
 * Ensures Mock Interview tables exist and are populated with the predefined content bank.
 * Completely idempotent and safe for existing data.
 */
export async function ensureMockInterviewTablesAndContent() {
  try {
    // 1. Create tables, indices, and foreign keys individually (avoids multi-statement prepared query error)
    const ddlStatements = [
      `CREATE TABLE IF NOT EXISTS "MockInterviewQuestion" (
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
      )`,
      `CREATE TABLE IF NOT EXISTS "MockInterviewRecruiterScenario" (
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
      )`,
      `CREATE TABLE IF NOT EXISTS "MockInterviewQuizQuestion" (
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
      )`,
      `CREATE TABLE IF NOT EXISTS "MockInterviewSavedQuestion" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "questionId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MockInterviewSavedQuestion_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "MockInterviewApplicantAttempt" (
        "id" TEXT NOT NULL,
        "studentId" TEXT NOT NULL,
        "questionId" TEXT NOT NULL,
        "writtenAnswer" TEXT NOT NULL,
        "checklistAssessment" JSONB NOT NULL DEFAULT '{}',
        "feedbackNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MockInterviewApplicantAttempt_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE TABLE IF NOT EXISTS "MockInterviewRecruiterAttempt" (
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
      )`,
      `CREATE TABLE IF NOT EXISTS "MockInterviewQuizAttempt" (
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
      )`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewQuestion_category_idx" ON "MockInterviewQuestion"("category")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewQuestion_difficulty_idx" ON "MockInterviewQuestion"("difficulty")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewRecruiterScenario_category_idx" ON "MockInterviewRecruiterScenario"("category")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewQuizQuestion_category_idx" ON "MockInterviewQuizQuestion"("category")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "MockInterviewSavedQuestion_studentId_questionId_key" ON "MockInterviewSavedQuestion"("studentId", "questionId")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewSavedQuestion_studentId_idx" ON "MockInterviewSavedQuestion"("studentId")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewSavedQuestion_questionId_idx" ON "MockInterviewSavedQuestion"("questionId")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewApplicantAttempt_studentId_createdAt_idx" ON "MockInterviewApplicantAttempt"("studentId", "createdAt")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewApplicantAttempt_questionId_idx" ON "MockInterviewApplicantAttempt"("questionId")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewRecruiterAttempt_studentId_completedAt_idx" ON "MockInterviewRecruiterAttempt"("studentId", "completedAt")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewRecruiterAttempt_scenarioId_idx" ON "MockInterviewRecruiterAttempt"("scenarioId")`,
      `CREATE INDEX IF NOT EXISTS "MockInterviewQuizAttempt_studentId_completedAt_idx" ON "MockInterviewQuizAttempt"("studentId", "completedAt")`,
      `DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewSavedQuestion_studentId_fkey') THEN
          ALTER TABLE "MockInterviewSavedQuestion" ADD CONSTRAINT "MockInterviewSavedQuestion_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewSavedQuestion_questionId_fkey') THEN
          ALTER TABLE "MockInterviewSavedQuestion" ADD CONSTRAINT "MockInterviewSavedQuestion_questionId_fkey"
            FOREIGN KEY ("questionId") REFERENCES "MockInterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewApplicantAttempt_studentId_fkey') THEN
          ALTER TABLE "MockInterviewApplicantAttempt" ADD CONSTRAINT "MockInterviewApplicantAttempt_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewApplicantAttempt_questionId_fkey') THEN
          ALTER TABLE "MockInterviewApplicantAttempt" ADD CONSTRAINT "MockInterviewApplicantAttempt_questionId_fkey"
            FOREIGN KEY ("questionId") REFERENCES "MockInterviewQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewRecruiterAttempt_studentId_fkey') THEN
          ALTER TABLE "MockInterviewRecruiterAttempt" ADD CONSTRAINT "MockInterviewRecruiterAttempt_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewRecruiterAttempt_scenarioId_fkey') THEN
          ALTER TABLE "MockInterviewRecruiterAttempt" ADD CONSTRAINT "MockInterviewRecruiterAttempt_scenarioId_fkey"
            FOREIGN KEY ("scenarioId") REFERENCES "MockInterviewRecruiterScenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewQuizAttempt_studentId_fkey') THEN
          ALTER TABLE "MockInterviewQuizAttempt" ADD CONSTRAINT "MockInterviewQuizAttempt_studentId_fkey"
            FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$`,
    ];

    for (const stmt of ddlStatements) {
      await db.$executeRawUnsafe(stmt);
    }

    // 2. Check if questions exist; if not, populate from PREDEFINED_QUESTIONS
    if (
      !("mockInterviewQuestion" in db) ||
      !("mockInterviewRecruiterScenario" in db) ||
      !("mockInterviewQuizQuestion" in db)
    ) {
      return;
    }

    const count = await db.mockInterviewQuestion.count();
    if (count < PREDEFINED_QUESTIONS.length) {
      for (const q of PREDEFINED_QUESTIONS) {
        await db.mockInterviewQuestion.upsert({
          where: { id: q.id },
          update: {
            category: q.category,
            difficulty: q.difficulty,
            questionText: q.questionText,
            jobPosition: q.jobPosition,
            situation: q.situation,
            modelAnswer: q.modelAnswer,
            interviewTip: q.interviewTip,
            evaluationCriteria: q.evaluationCriteria,
            competency: q.competency,
          },
          create: {
            id: q.id,
            category: q.category,
            difficulty: q.difficulty,
            questionText: q.questionText,
            jobPosition: q.jobPosition,
            situation: q.situation,
            modelAnswer: q.modelAnswer,
            interviewTip: q.interviewTip,
            evaluationCriteria: q.evaluationCriteria,
            competency: q.competency,
          },
        });
      }
    }

    const sCount = await db.mockInterviewRecruiterScenario.count();
    if (sCount < PREDEFINED_SCENARIOS.length) {
      for (const s of PREDEFINED_SCENARIOS) {
        await db.mockInterviewRecruiterScenario.upsert({
          where: { id: s.id },
          update: {
            title: s.title,
            category: s.category,
            roleOrPosition: s.roleOrPosition,
            context: s.context,
            questionOptions: s.questionOptions as any,
            applicantAnswers: s.applicantAnswers as any,
            followUpOptions: (s.followUpOptions || []) as any,
            practicalAdvice: s.practicalAdvice,
            competency: s.competency,
          },
          create: {
            id: s.id,
            title: s.title,
            category: s.category,
            roleOrPosition: s.roleOrPosition,
            context: s.context,
            questionOptions: s.questionOptions as any,
            applicantAnswers: s.applicantAnswers as any,
            followUpOptions: (s.followUpOptions || []) as any,
            practicalAdvice: s.practicalAdvice,
            competency: s.competency,
          },
        });
      }
    }

    const qCount = await db.mockInterviewQuizQuestion.count();
    if (qCount < PREDEFINED_QUIZ_QUESTIONS.length) {
      for (const q of PREDEFINED_QUIZ_QUESTIONS) {
        await db.mockInterviewQuizQuestion.upsert({
          where: { id: q.id },
          update: {
            questionText: q.questionText,
            choices: q.choices as any,
            correctAnswer: q.correctAnswer ?? 0,
            explanation: q.explanation ?? "",
            category: q.category,
            difficulty: q.difficulty,
            pointValue: q.pointValue,
          },
          create: {
            id: q.id,
            questionText: q.questionText,
            choices: q.choices as any,
            correctAnswer: q.correctAnswer ?? 0,
            explanation: q.explanation ?? "",
            category: q.category,
            difficulty: q.difficulty,
            pointValue: q.pointValue,
          },
        });
      }
    }
  } catch (err) {
    console.warn("ensureMockInterviewTablesAndContent warning:", err);
  }
}
