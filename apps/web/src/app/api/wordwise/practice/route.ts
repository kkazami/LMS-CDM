import { NextResponse } from "next/server";
import {
  requireWordWiseStudent,
  sameOriginViolation,
} from "@/lib/wordwise/access";
import { getTodayDateKey } from "@/lib/wordwise/content-bank";
import {
  generatePracticeQuestions,
  gradePracticeAttempt,
} from "@/lib/wordwise/practice-engine";
import { buildWordWiseProgressSummary } from "@/lib/wordwise/progress";
import {
  loadAllVocabularyWordsFromDb,
  loadStudentWordWiseState,
  recordQuizAttemptInDb,
} from "@/lib/wordwise/server-db";
import type {
  PracticeQuestionItem,
  WordWiseCategorySlug,
  WordWiseDifficulty,
  WordWiseExerciseType,
} from "@/lib/wordwise/types";

const VALID_EXERCISE_TYPES: readonly WordWiseExerciseType[] = [
  "MULTIPLE_CHOICE",
  "WORD_MATCHING",
  "FILL_IN_BLANKS",
  "FORMAL_REPLACEMENT",
  "SENTENCE_CONSTRUCTION",
];

const VALID_DIFFICULTIES: readonly (WordWiseDifficulty | "ALL")[] = [
  "ALL",
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
];

export async function GET(req: Request) {
  const auth = await requireWordWiseStudent(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const rawType = (searchParams.get("exerciseType") ?? "MULTIPLE_CHOICE").trim();
  const rawDiff = (searchParams.get("difficulty") ?? "ALL").trim();
  const rawCategory = (searchParams.get("category") ?? "ALL").trim();
  const rawSeed =
    searchParams.get("seed") ?? `${auth.user.id}:${Date.now()}`;

  const exerciseType: WordWiseExerciseType = VALID_EXERCISE_TYPES.includes(
    rawType as WordWiseExerciseType
  )
    ? (rawType as WordWiseExerciseType)
    : "MULTIPLE_CHOICE";

  const difficulty: WordWiseDifficulty | "ALL" = VALID_DIFFICULTIES.includes(
    rawDiff as WordWiseDifficulty | "ALL"
  )
    ? (rawDiff as WordWiseDifficulty | "ALL")
    : "ALL";

  const { words } = await loadAllVocabularyWordsFromDb();

  const questions = generatePracticeQuestions({
    words,
    exerciseType,
    difficulty,
    categorySlug: (rawCategory || "ALL") as WordWiseCategorySlug | "ALL",
    questionCount: 5,
    seed: rawSeed,
  });

  return NextResponse.json({
    exerciseType,
    difficulty,
    categorySlug: rawCategory === "ALL" ? null : rawCategory,
    questions,
  });
}

export async function POST(req: Request) {
  const originError = sameOriginViolation(req);
  if (originError) return originError;

  const auth = await requireWordWiseStudent(req);
  if (auth.errorResponse) return auth.errorResponse;
  const { user } = auth;

  let body: {
    exerciseType?: unknown;
    difficulty?: unknown;
    categorySlug?: unknown;
    questions?: unknown;
    answers?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const exerciseType: WordWiseExerciseType = VALID_EXERCISE_TYPES.includes(
    body.exerciseType as WordWiseExerciseType
  )
    ? (body.exerciseType as WordWiseExerciseType)
    : "MULTIPLE_CHOICE";

  const difficulty =
    typeof body.difficulty === "string" && body.difficulty.trim()
      ? body.difficulty.trim()
      : "INTERMEDIATE";

  const categorySlug =
    typeof body.categorySlug === "string" &&
    body.categorySlug.trim() &&
    body.categorySlug.trim() !== "ALL"
      ? body.categorySlug.trim()
      : null;

  if (!Array.isArray(body.questions) || body.questions.length === 0) {
    return NextResponse.json(
      { error: "Practice questions are required to grade an attempt." },
      { status: 400 }
    );
  }

  const questions = body.questions.slice(0, 15) as PracticeQuestionItem[];
  const answers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as Record<string, string>)
      : {};

  const graded = gradePracticeAttempt({ questions, answers });

  const createdAttempt = await recordQuizAttemptInDb({
    studentId: user.id,
    exerciseType,
    difficulty,
    categorySlug,
    totalQuestions: graded.totalQuestions,
    correctAnswers: graded.correctAnswers,
    accuracyPct: graded.accuracyPct,
    feedbackItems: graded.feedbackItems,
  });

  const [{ categories, words }, studentState] = await Promise.all([
    loadAllVocabularyWordsFromDb(),
    loadStudentWordWiseState(user.id),
  ]);

  const progressSummary = buildWordWiseProgressSummary({
    categories,
    words,
    savedWords: studentState.savedWords,
    wordProgress: studentState.wordProgress,
    quizAttempts: studentState.quizAttempts,
    todayDateKey: getTodayDateKey(),
  });

  return NextResponse.json({
    attempt: {
      id: createdAttempt.id,
      exerciseType,
      difficulty: difficulty as WordWiseDifficulty,
      categorySlug,
      totalQuestions: graded.totalQuestions,
      correctAnswers: graded.correctAnswers,
      accuracyPct: graded.accuracyPct,
      completedAt: createdAttempt.completedAt,
      feedbackItems: graded.feedbackItems,
    },
    wordProgress: studentState.wordProgress,
    quizAttempts: studentState.quizAttempts,
    progressSummary,
  });
}
