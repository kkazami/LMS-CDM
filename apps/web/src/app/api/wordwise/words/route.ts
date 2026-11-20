import { NextResponse } from "next/server";
import {
  requireWordWiseStudent,
  sameOriginViolation,
} from "@/lib/wordwise/access";
import { getTodayDateKey } from "@/lib/wordwise/content-bank";
import { buildWordWiseProgressSummary } from "@/lib/wordwise/progress";
import {
  loadAllVocabularyWordsFromDb,
  loadStudentWordWiseState,
  queryWordWiseDictionaryFromDb,
  recordStudentWordExplorationInDb,
  wordExistsInDbOrSeed,
} from "@/lib/wordwise/server-db";

export async function GET(req: Request) {
  const auth = await requireWordWiseStudent(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";
  const categorySlug = searchParams.get("category") ?? "ALL";
  const partOfSpeech = searchParams.get("partOfSpeech") ?? "ALL";
  const difficulty = searchParams.get("difficulty") ?? "ALL";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(searchParams.get("pageSize") ?? "9") || 9;

  const result = await queryWordWiseDictionaryFromDb({
    search,
    categorySlug,
    partOfSpeech,
    difficulty,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const originError = sameOriginViolation(req);
  if (originError) return originError;

  const auth = await requireWordWiseStudent(req);
  if (auth.errorResponse) return auth.errorResponse;
  const { user } = auth;

  let body: { wordId?: unknown; status?: unknown };
  try {
    body = (await req.json()) as { wordId?: unknown; status?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wordId = typeof body.wordId === "string" ? body.wordId.trim() : "";
  if (!wordId) {
    return NextResponse.json(
      { error: "wordId is required" },
      { status: 400 }
    );
  }

  const wordExists = await wordExistsInDbOrSeed(wordId);
  if (!wordExists) {
    return NextResponse.json(
      { error: "Vocabulary word not found" },
      { status: 404 }
    );
  }

  const requestedStatus =
    body.status === "MASTERED"
      ? "MASTERED"
      : body.status === "LEARNING"
      ? "LEARNING"
      : undefined;

  await recordStudentWordExplorationInDb({
    studentId: user.id,
    wordId,
    requestedStatus,
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
    wordProgress: studentState.wordProgress,
    progressSummary,
  });
}
