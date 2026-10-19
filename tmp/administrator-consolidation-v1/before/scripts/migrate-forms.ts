import { Pool, type PoolConfig } from "pg";
import "dotenv/config";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL is not set.");
  process.exit(1);
}

const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1") ||
  connectionString.includes("::1");

const poolConfig: PoolConfig = {
  connectionString,
  ssl: !isLocalhost ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 15000,
};

const pool = new Pool(poolConfig);

async function migrate() {
  console.log("Connecting to PostgreSQL to apply Forms module schema...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Form Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Form" (
        "id" TEXT NOT NULL,
        "courseId" TEXT NOT NULL,
        "syllabusItemId" TEXT NOT NULL,
        "createdBy" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "formType" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "opensAt" TIMESTAMP(3),
        "closesAt" TIMESTAMP(3),
        "timeLimitMins" INTEGER,
        "maxAttempts" INTEGER NOT NULL DEFAULT 1,
        "scoreToKeep" TEXT NOT NULL DEFAULT 'HIGHEST',
        "shuffleQuestions" BOOLEAN NOT NULL DEFAULT false,
        "shuffleOptions" BOOLEAN NOT NULL DEFAULT false,
        "showScoreAfter" BOOLEAN NOT NULL DEFAULT true,
        "showAnswersAfter" BOOLEAN NOT NULL DEFAULT false,
        "showFeedbackAfter" BOOLEAN NOT NULL DEFAULT false,
        "isProctored" BOOLEAN NOT NULL DEFAULT false,
        "passwordHash" TEXT,
        "disableCopyPaste" BOOLEAN NOT NULL DEFAULT false,
        "detectTabSwitch" BOOLEAN NOT NULL DEFAULT false,
        "lockBrowser" BOOLEAN NOT NULL DEFAULT false,
        "totalPoints" DOUBLE PRECISION,
        "passingScore" DOUBLE PRECISION,
        "confirmationMessage" TEXT,
        "themeColor" TEXT,
        "headerImageUrl" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
      );
    `);

    // 2. FormSection Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "FormSection" (
        "id" TEXT NOT NULL,
        "formId" TEXT NOT NULL,
        "title" TEXT,
        "description" TEXT,
        "position" INTEGER NOT NULL DEFAULT 0,
        "pageNumber" INTEGER NOT NULL DEFAULT 1,

        CONSTRAINT "FormSection_pkey" PRIMARY KEY ("id")
      );
    `);

    // 3. QuestionBankItem Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "QuestionBankItem" (
        "id" TEXT NOT NULL,
        "courseId" TEXT,
        "createdBy" TEXT NOT NULL,
        "questionType" TEXT NOT NULL,
        "prompt" TEXT NOT NULL,
        "config" TEXT NOT NULL DEFAULT '{}',
        "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "tags" TEXT NOT NULL DEFAULT '[]',
        "timesUsed" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "QuestionBankItem_pkey" PRIMARY KEY ("id")
      );
    `);

    // 4. FormQuestion Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "FormQuestion" (
        "id" TEXT NOT NULL,
        "formId" TEXT NOT NULL,
        "sectionId" TEXT,
        "bankItemId" TEXT,
        "questionType" TEXT NOT NULL,
        "prompt" TEXT NOT NULL,
        "description" TEXT,
        "mediaUrl" TEXT,
        "mediaType" TEXT,
        "position" INTEGER NOT NULL DEFAULT 0,
        "isRequired" BOOLEAN NOT NULL DEFAULT true,
        "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
        "partialCredit" BOOLEAN NOT NULL DEFAULT false,
        "config" TEXT NOT NULL DEFAULT '{}',
        "showIfQuestionId" TEXT,
        "showIfAnswer" TEXT,
        "minLength" INTEGER,
        "maxLength" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "FormQuestion_pkey" PRIMARY KEY ("id")
      );
    `);

    // 5. FormAttempt Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "FormAttempt" (
        "id" TEXT NOT NULL,
        "formId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "attemptNumber" INTEGER NOT NULL DEFAULT 1,
        "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "submittedAt" TIMESTAMP(3),
        "timeSpentSecs" INTEGER,
        "deadlineAt" TIMESTAMP(3),
        "rawScore" DOUBLE PRECISION,
        "totalPoints" DOUBLE PRECISION,
        "percentage" DOUBLE PRECISION,
        "passed" BOOLEAN,
        "syncedToGradebook" BOOLEAN NOT NULL DEFAULT false,
        "syncedAt" TIMESTAMP(3),
        "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
        "copyPasteCount" INTEGER NOT NULL DEFAULT 0,
        "ipAddress" TEXT,
        "userAgent" TEXT,

        CONSTRAINT "FormAttempt_pkey" PRIMARY KEY ("id")
      );
    `);

    // 6. FormAttemptAnswer Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "FormAttemptAnswer" (
        "id" TEXT NOT NULL,
        "attemptId" TEXT NOT NULL,
        "questionId" TEXT NOT NULL,
        "answerText" TEXT,
        "answerOptions" TEXT,
        "answerNumber" DOUBLE PRECISION,
        "answerDate" TIMESTAMP(3),
        "answerRanking" TEXT,
        "answerMatrix" TEXT,
        "fileUrl" TEXT,
        "fileName" TEXT,
        "fileSizeBytes" INTEGER,
        "isCorrect" BOOLEAN,
        "pointsAwarded" DOUBLE PRECISION,
        "autoGraded" BOOLEAN NOT NULL DEFAULT false,
        "instructorGraded" BOOLEAN NOT NULL DEFAULT false,
        "feedback" TEXT,
        "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "FormAttemptAnswer_pkey" PRIMARY KEY ("id")
      );
    `);

    // Create Unique Constraints if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Form_syllabusItemId_key'
        ) THEN
          ALTER TABLE "Form" ADD CONSTRAINT "Form_syllabusItemId_key" UNIQUE ("syllabusItemId");
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FormAttempt_formId_userId_attemptNumber_key'
        ) THEN
          ALTER TABLE "FormAttempt" ADD CONSTRAINT "FormAttempt_formId_userId_attemptNumber_key" UNIQUE ("formId", "userId", "attemptNumber");
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FormAttemptAnswer_attemptId_questionId_key'
        ) THEN
          ALTER TABLE "FormAttemptAnswer" ADD CONSTRAINT "FormAttemptAnswer_attemptId_questionId_key" UNIQUE ("attemptId", "questionId");
        END IF;
      END $$;
    `);

    // Create Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS "Form_courseId_status_idx" ON "Form"("courseId", "status");
      CREATE INDEX IF NOT EXISTS "Form_createdBy_idx" ON "Form"("createdBy");

      CREATE INDEX IF NOT EXISTS "FormSection_formId_position_idx" ON "FormSection"("formId", "position");

      CREATE INDEX IF NOT EXISTS "QuestionBankItem_courseId_idx" ON "QuestionBankItem"("courseId");
      CREATE INDEX IF NOT EXISTS "QuestionBankItem_createdBy_idx" ON "QuestionBankItem"("createdBy");
      CREATE INDEX IF NOT EXISTS "QuestionBankItem_questionType_idx" ON "QuestionBankItem"("questionType");

      CREATE INDEX IF NOT EXISTS "FormQuestion_formId_position_idx" ON "FormQuestion"("formId", "position");
      CREATE INDEX IF NOT EXISTS "FormQuestion_sectionId_idx" ON "FormQuestion"("sectionId");

      CREATE INDEX IF NOT EXISTS "FormAttempt_formId_status_idx" ON "FormAttempt"("formId", "status");
      CREATE INDEX IF NOT EXISTS "FormAttempt_userId_idx" ON "FormAttempt"("userId");

      CREATE INDEX IF NOT EXISTS "FormAttemptAnswer_attemptId_idx" ON "FormAttemptAnswer"("attemptId");
      CREATE INDEX IF NOT EXISTS "FormAttemptAnswer_questionId_idx" ON "FormAttemptAnswer"("questionId");
    `);

    // Add Foreign Keys
    await client.query(`
      DO $$
      BEGIN
        -- Form -> Course
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Form_courseId_fkey') THEN
          ALTER TABLE "Form" ADD CONSTRAINT "Form_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- Form -> SyllabusItem
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Form_syllabusItemId_fkey') THEN
          ALTER TABLE "Form" ADD CONSTRAINT "Form_syllabusItemId_fkey" FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- Form -> User (creator)
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Form_createdBy_fkey') THEN
          ALTER TABLE "Form" ADD CONSTRAINT "Form_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;

        -- FormSection -> Form
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormSection_formId_fkey') THEN
          ALTER TABLE "FormSection" ADD CONSTRAINT "FormSection_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- QuestionBankItem -> Course
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionBankItem_courseId_fkey') THEN
          ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        -- QuestionBankItem -> User
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'QuestionBankItem_createdBy_fkey') THEN
          ALTER TABLE "QuestionBankItem" ADD CONSTRAINT "QuestionBankItem_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;

        -- FormQuestion -> Form
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormQuestion_formId_fkey') THEN
          ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- FormQuestion -> FormSection
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormQuestion_sectionId_fkey') THEN
          ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "FormSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        -- FormQuestion -> QuestionBankItem
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormQuestion_bankItemId_fkey') THEN
          ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_bankItemId_fkey" FOREIGN KEY ("bankItemId") REFERENCES "QuestionBankItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        -- FormQuestion -> FormQuestion (showIfQuestionId)
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormQuestion_showIfQuestionId_fkey') THEN
          ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_showIfQuestionId_fkey" FOREIGN KEY ("showIfQuestionId") REFERENCES "FormQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        -- FormAttempt -> Form
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormAttempt_formId_fkey') THEN
          ALTER TABLE "FormAttempt" ADD CONSTRAINT "FormAttempt_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- FormAttempt -> User
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormAttempt_userId_fkey') THEN
          ALTER TABLE "FormAttempt" ADD CONSTRAINT "FormAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- FormAttemptAnswer -> FormAttempt
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormAttemptAnswer_attemptId_fkey') THEN
          ALTER TABLE "FormAttemptAnswer" ADD CONSTRAINT "FormAttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "FormAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        -- FormAttemptAnswer -> FormQuestion
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FormAttemptAnswer_questionId_fkey') THEN
          ALTER TABLE "FormAttemptAnswer" ADD CONSTRAINT "FormAttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "FormQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await client.query("COMMIT;");
    console.log("SUCCESS! All 6 Forms module tables, constraints, and indexes migrated successfully.");
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
