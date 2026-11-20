import { NextResponse } from "next/server";
import {
  requireWordWiseStudent,
  sameOriginViolation,
} from "@/lib/wordwise/access";
import { getTodayDateKey } from "@/lib/wordwise/content-bank";
import { buildWordWiseProgressSummary } from "@/lib/wordwise/progress";
import {
  createPersonalVocabularyListInDb,
  deletePersonalVocabularyListInDb,
  loadAllVocabularyWordsFromDb,
  loadStudentWordWiseState,
  removeStudentSavedWordInDb,
  toggleWordInPersonalListInDb,
  upsertStudentSavedWordInDb,
  wordExistsInDbOrSeed,
} from "@/lib/wordwise/server-db";

export async function POST(req: Request) {
  const originError = sameOriginViolation(req);
  if (originError) return originError;

  const auth = await requireWordWiseStudent(req);
  if (auth.errorResponse) return auth.errorResponse;
  const { user } = auth;

  let body: {
    action?: unknown;
    wordId?: unknown;
    status?: unknown;
    notes?: unknown;
    listId?: unknown;
    name?: unknown;
    description?: unknown;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";

  if (action === "saveWord" || action === "updateSavedWord") {
    const wordId = typeof body.wordId === "string" ? body.wordId.trim() : "";
    if (!wordId) {
      return NextResponse.json({ error: "wordId is required" }, { status: 400 });
    }

    const wordExists = await wordExistsInDbOrSeed(wordId);
    if (!wordExists) {
      return NextResponse.json(
        { error: "Vocabulary word not found" },
        { status: 404 }
      );
    }

    const status = body.status === "MASTERED" ? "MASTERED" : "LEARNING";
    const notes =
      typeof body.notes === "string" ? body.notes.trim().slice(0, 1000) : undefined;

    await upsertStudentSavedWordInDb({
      studentId: user.id,
      wordId,
      status,
      notes,
    });
  } else if (action === "removeSavedWord") {
    const wordId = typeof body.wordId === "string" ? body.wordId.trim() : "";
    if (!wordId) {
      return NextResponse.json({ error: "wordId is required" }, { status: 400 });
    }

    await removeStudentSavedWordInDb({
      studentId: user.id,
      wordId,
    });
  } else if (action === "createList") {
    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, 240)
        : "";

    if (!name) {
      return NextResponse.json(
        { error: "Please enter a name for your vocabulary list." },
        { status: 400 }
      );
    }

    await createPersonalVocabularyListInDb({
      studentId: user.id,
      name,
      description,
    });
  } else if (action === "deleteList") {
    const listId = typeof body.listId === "string" ? body.listId.trim() : "";
    if (!listId) {
      return NextResponse.json({ error: "listId is required" }, { status: 400 });
    }

    await deletePersonalVocabularyListInDb({
      studentId: user.id,
      listId,
    });
  } else if (action === "toggleListWord") {
    const listId = typeof body.listId === "string" ? body.listId.trim() : "";
    const wordId = typeof body.wordId === "string" ? body.wordId.trim() : "";

    if (!listId || !wordId) {
      return NextResponse.json(
        { error: "listId and wordId are required" },
        { status: 400 }
      );
    }

    const found = await toggleWordInPersonalListInDb({
      studentId: user.id,
      listId,
      wordId,
    });
    if (!found) {
      return NextResponse.json(
        { error: "Vocabulary list not found" },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json(
      { error: "Unsupported collection action" },
      { status: 400 }
    );
  }

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
    savedWords: studentState.savedWords,
    wordProgress: studentState.wordProgress,
    personalLists: studentState.personalLists,
    progressSummary,
  });
}
