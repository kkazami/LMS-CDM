-- Additive migration: IBE WordWise (Vocabulary & Academic Language Hub)
-- and IBE Consultation & Appointment Scheduling System
-- Safe and idempotent (IF NOT EXISTS) for Neon production database.

BEGIN;

-- ─── 0. IBE Mock Interview AI Evaluation Columns & Request Ledger ───

ALTER TABLE public."MockInterviewApplicantAttempt"
  ADD COLUMN IF NOT EXISTS "aiScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "aiRating" TEXT,
  ADD COLUMN IF NOT EXISTS "aiFeedback" JSONB,
  ADD COLUMN IF NOT EXISTS "aiProvider" TEXT;

CREATE TABLE IF NOT EXISTS public."MockInterviewAiRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockInterviewAiRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MockInterviewAiRequest_studentId_createdAt_idx" ON public."MockInterviewAiRequest"("studentId", "createdAt");

-- ─── 1. IBE WordWise – Vocabulary & Academic Language Hub ───

CREATE TABLE IF NOT EXISTS public."VocabularyCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyCategory_slug_key" ON public."VocabularyCategory"("slug");

CREATE TABLE IF NOT EXISTS public."VocabularyWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pronunciation" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL,
    "simpleDefinition" TEXT NOT NULL,
    "formalDefinition" TEXT NOT NULL,
    "usageContext" TEXT NOT NULL,
    "informalEquivalent" TEXT,
    "formalUsageNote" TEXT,
    "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyWord_word_key" ON public."VocabularyWord"("word");
CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyWord_slug_key" ON public."VocabularyWord"("slug");
CREATE INDEX IF NOT EXISTS "VocabularyWord_categoryId_idx" ON public."VocabularyWord"("categoryId");
CREATE INDEX IF NOT EXISTS "VocabularyWord_difficulty_idx" ON public."VocabularyWord"("difficulty");

CREATE TABLE IF NOT EXISTS public."VocabularySynonym" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "relation" TEXT NOT NULL DEFAULT 'SYNONYM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularySynonym_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VocabularySynonym_wordId_term_relation_key" ON public."VocabularySynonym"("wordId", "term", "relation");
CREATE INDEX IF NOT EXISTS "VocabularySynonym_wordId_idx" ON public."VocabularySynonym"("wordId");

CREATE TABLE IF NOT EXISTS public."VocabularyExample" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "sentence" TEXT NOT NULL,
    "contextNote" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyExample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VocabularyExample_wordId_idx" ON public."VocabularyExample"("wordId");

CREATE TABLE IF NOT EXISTS public."StudentSavedWord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LEARNING',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSavedWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentSavedWord_studentId_wordId_key" ON public."StudentSavedWord"("studentId", "wordId");
CREATE INDEX IF NOT EXISTS "StudentSavedWord_studentId_status_idx" ON public."StudentSavedWord"("studentId", "status");

CREATE TABLE IF NOT EXISTS public."StudentVocabularyProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'EXPLORED',
    "exploredCount" INTEGER NOT NULL DEFAULT 1,
    "practiceCount" INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "lastExploredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "masteredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentVocabularyProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StudentVocabularyProgress_studentId_wordId_key" ON public."StudentVocabularyProgress"("studentId", "wordId");
CREATE INDEX IF NOT EXISTS "StudentVocabularyProgress_studentId_status_idx" ON public."StudentVocabularyProgress"("studentId", "status");
CREATE INDEX IF NOT EXISTS "StudentVocabularyProgress_studentId_lastExploredAt_idx" ON public."StudentVocabularyProgress"("studentId", "lastExploredAt");

CREATE TABLE IF NOT EXISTS public."VocabularyQuizAttempt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "exerciseType" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "categorySlug" TEXT,
    "totalQuestions" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL,
    "accuracyPct" INTEGER NOT NULL,
    "details" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyQuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VocabularyQuizAttempt_studentId_completedAt_idx" ON public."VocabularyQuizAttempt"("studentId", "completedAt");
CREATE INDEX IF NOT EXISTS "VocabularyQuizAttempt_studentId_exerciseType_idx" ON public."VocabularyQuizAttempt"("studentId", "exerciseType");

CREATE TABLE IF NOT EXISTS public."VocabularyPersonalList" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyPersonalList_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyPersonalList_studentId_name_key" ON public."VocabularyPersonalList"("studentId", "name");
CREATE INDEX IF NOT EXISTS "VocabularyPersonalList_studentId_idx" ON public."VocabularyPersonalList"("studentId");

CREATE TABLE IF NOT EXISTS public."VocabularyPersonalListWord" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyPersonalListWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyPersonalListWord_listId_wordId_key" ON public."VocabularyPersonalListWord"("listId", "wordId");
CREATE INDEX IF NOT EXISTS "VocabularyPersonalListWord_listId_idx" ON public."VocabularyPersonalListWord"("listId");
CREATE INDEX IF NOT EXISTS "VocabularyPersonalListWord_wordId_idx" ON public."VocabularyPersonalListWord"("wordId");

-- ─── 2. IBE Consultation & Appointment Scheduling System ───

CREATE TABLE IF NOT EXISTS public."InstructorAvailability" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "maxAppointmentsPerDay" INTEGER NOT NULL DEFAULT 8,
    "meetingType" TEXT NOT NULL DEFAULT 'BOTH',
    "location" TEXT NOT NULL DEFAULT '',
    "meetingLink" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSuspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorAvailability_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InstructorAvailability_instructorId_dayOfWeek_isActive_idx" ON public."InstructorAvailability"("instructorId", "dayOfWeek", "isActive");
CREATE INDEX IF NOT EXISTS "InstructorAvailability_instructorId_idx" ON public."InstructorAvailability"("instructorId");

CREATE TABLE IF NOT EXISTS public."InstructorBlockedDate" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstructorBlockedDate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InstructorBlockedDate_instructorId_startAt_endAt_idx" ON public."InstructorBlockedDate"("instructorId", "startAt", "endAt");

CREATE TABLE IF NOT EXISTS public."Appointment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "availabilityId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "additionalMessage" TEXT,
    "requestedStartAt" TIMESTAMP(3) NOT NULL,
    "requestedEndAt" TIMESTAMP(3) NOT NULL,
    "proposedStartAt" TIMESTAMP(3),
    "proposedEndAt" TIMESTAMP(3),
    "meetingType" TEXT NOT NULL DEFAULT 'FACE_TO_FACE',
    "meetingLocation" TEXT,
    "meetingLink" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attendanceOutcome" TEXT,
    "instructorResponse" TEXT,
    "rejectionReason" TEXT,
    "cancellationReason" TEXT,
    "cancelledByRole" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Appointment_studentId_status_requestedStartAt_idx" ON public."Appointment"("studentId", "status", "requestedStartAt");
CREATE INDEX IF NOT EXISTS "Appointment_studentId_createdAt_idx" ON public."Appointment"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "Appointment_instructorId_status_requestedStartAt_idx" ON public."Appointment"("instructorId", "status", "requestedStartAt");
CREATE INDEX IF NOT EXISTS "Appointment_instructorId_createdAt_idx" ON public."Appointment"("instructorId", "createdAt");
CREATE INDEX IF NOT EXISTS "Appointment_subjectId_idx" ON public."Appointment"("subjectId");

CREATE TABLE IF NOT EXISTS public."AppointmentAttachment" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storedFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AppointmentAttachment_appointmentId_idx" ON public."AppointmentAttachment"("appointmentId");
CREATE INDEX IF NOT EXISTS "AppointmentAttachment_storageKey_idx" ON public."AppointmentAttachment"("storageKey");

CREATE TABLE IF NOT EXISTS public."AppointmentMessage" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AppointmentMessage_appointmentId_createdAt_idx" ON public."AppointmentMessage"("appointmentId", "createdAt");
CREATE INDEX IF NOT EXISTS "AppointmentMessage_senderId_idx" ON public."AppointmentMessage"("senderId");

-- ─── 3. Foreign Keys (Idempotent) ───

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MockInterviewAiRequest_studentId_fkey') THEN
    ALTER TABLE public."MockInterviewAiRequest" ADD CONSTRAINT "MockInterviewAiRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VocabularyWord_categoryId_fkey') THEN
    ALTER TABLE public."VocabularyWord" ADD CONSTRAINT "VocabularyWord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."VocabularyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VocabularySynonym_wordId_fkey') THEN
    ALTER TABLE public."VocabularySynonym" ADD CONSTRAINT "VocabularySynonym_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES public."VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VocabularyExample_wordId_fkey') THEN
    ALTER TABLE public."VocabularyExample" ADD CONSTRAINT "VocabularyExample_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES public."VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentSavedWord_studentId_fkey') THEN
    ALTER TABLE public."StudentSavedWord" ADD CONSTRAINT "StudentSavedWord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentSavedWord_wordId_fkey') THEN
    ALTER TABLE public."StudentSavedWord" ADD CONSTRAINT "StudentSavedWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES public."VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentVocabularyProgress_studentId_fkey') THEN
    ALTER TABLE public."StudentVocabularyProgress" ADD CONSTRAINT "StudentVocabularyProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentVocabularyProgress_wordId_fkey') THEN
    ALTER TABLE public."StudentVocabularyProgress" ADD CONSTRAINT "StudentVocabularyProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES public."VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VocabularyQuizAttempt_studentId_fkey') THEN
    ALTER TABLE public."VocabularyQuizAttempt" ADD CONSTRAINT "VocabularyQuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VocabularyPersonalList_studentId_fkey') THEN
    ALTER TABLE public."VocabularyPersonalList" ADD CONSTRAINT "VocabularyPersonalList_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VocabularyPersonalListWord_listId_fkey') THEN
    ALTER TABLE public."VocabularyPersonalListWord" ADD CONSTRAINT "VocabularyPersonalListWord_listId_fkey" FOREIGN KEY ("listId") REFERENCES public."VocabularyPersonalList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VocabularyPersonalListWord_wordId_fkey') THEN
    ALTER TABLE public."VocabularyPersonalListWord" ADD CONSTRAINT "VocabularyPersonalListWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES public."VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorAvailability_instructorId_fkey') THEN
    ALTER TABLE public."InstructorAvailability" ADD CONSTRAINT "InstructorAvailability_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InstructorBlockedDate_instructorId_fkey') THEN
    ALTER TABLE public."InstructorBlockedDate" ADD CONSTRAINT "InstructorBlockedDate_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_studentId_fkey') THEN
    ALTER TABLE public."Appointment" ADD CONSTRAINT "Appointment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_instructorId_fkey') THEN
    ALTER TABLE public."Appointment" ADD CONSTRAINT "Appointment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_subjectId_fkey') THEN
    ALTER TABLE public."Appointment" ADD CONSTRAINT "Appointment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES public."Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Appointment_availabilityId_fkey') THEN
    ALTER TABLE public."Appointment" ADD CONSTRAINT "Appointment_availabilityId_fkey" FOREIGN KEY ("availabilityId") REFERENCES public."InstructorAvailability"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentAttachment_appointmentId_fkey') THEN
    ALTER TABLE public."AppointmentAttachment" ADD CONSTRAINT "AppointmentAttachment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentMessage_appointmentId_fkey') THEN
    ALTER TABLE public."AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES public."Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentMessage_senderId_fkey') THEN
    ALTER TABLE public."AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─── 4. Ensure Required IBE Academic Programs ("BSBA HRM" & "BS ENTREP") Exist ───

INSERT INTO public."AcademicProgram" ("id", "instituteId", "code", "name", "isActive", "createdAt")
SELECT
  'ibe-prog-bsba-hrm',
  i."id",
  'BSBA HRM',
  'Bachelor of Science in Business Administration Major in Human Resource Management',
  true,
  CURRENT_TIMESTAMP
FROM public."Institute" i
WHERE LOWER(i."code") = 'ibe'
  AND NOT EXISTS (
    SELECT 1 FROM public."AcademicProgram" ap
    WHERE ap."instituteId" = i."id" AND ap."code" = 'BSBA HRM'
  );

INSERT INTO public."AcademicProgram" ("id", "instituteId", "code", "name", "isActive", "createdAt")
SELECT
  'ibe-prog-bs-entrep',
  i."id",
  'BS ENTREP',
  'Bachelor of Science in Entrepreneurship',
  true,
  CURRENT_TIMESTAMP
FROM public."Institute" i
WHERE LOWER(i."code") = 'ibe'
  AND NOT EXISTS (
    SELECT 1 FROM public."AcademicProgram" ap
    WHERE ap."instituteId" = i."id" AND ap."code" = 'BS ENTREP'
  );

-- ─── 5. Grant Runtime Table Privileges to Restricted Application Role ───

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public."MockInterviewAiRequest",
      public."VocabularyCategory",
      public."VocabularyWord",
      public."VocabularySynonym",
      public."VocabularyExample",
      public."StudentSavedWord",
      public."StudentVocabularyProgress",
      public."VocabularyQuizAttempt",
      public."VocabularyPersonalList",
      public."VocabularyPersonalListWord",
      public."InstructorAvailability",
      public."InstructorBlockedDate",
      public."Appointment",
      public."AppointmentAttachment",
      public."AppointmentMessage",
      public."AcademicProgram"
    TO lms_web_runtime_v1';
  END IF;
END $$;

COMMIT;

