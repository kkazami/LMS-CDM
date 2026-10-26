import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { normalizeRole } from "@/lib/admin-types";
import type { ArenaQuestionType } from "@/types/arena";

export const dynamic = "force-dynamic";

/**
 * GET /api/arena/quizzes/[quizId]
 * Retrieve full quiz details including questions and answer choices.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    const quiz = await db.arenaQuiz.findUnique({
      where: { id: quizId },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        course: {
          select: { id: true, title: true, code: true },
        },
        questions: {
          include: {
            choices: {
              orderBy: { orderIndex: "asc" },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    const role = normalizeRole(session.user.role as string);
    const isAuthor = quiz.authorId === session.user.id;
    const isAdmin = role === "ADMIN";

    // Students may only view questions if quiz is published or in self-paced mode
    if (!isAuthor && !isAdmin && quiz.status !== "PUBLISHED") {
      return NextResponse.json({ message: "Forbidden: Quiz is in draft mode" }, { status: 403 });
    }

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("GET_ARENA_QUIZ_BY_ID_ERROR", error);
    return NextResponse.json({ message: "Failed to retrieve quiz" }, { status: 500 });
  }
}

interface ChoiceInput {
  id?: string;
  choiceText: string;
  isCorrect: boolean;
  colorIndex?: number;
  orderIndex?: number;
}

interface QuestionInput {
  id?: string;
  questionText: string;
  questionType?: ArenaQuestionType;
  mediaUrl?: string | null;
  timeLimitSeconds?: number;
  basePoints?: number;
  speedBonusEnabled?: boolean;
  explanation?: string | null;
  orderIndex?: number;
  choices: ChoiceInput[];
}

/**
 * PUT /api/arena/quizzes/[quizId]
 * Update quiz details, questions, and choices.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const existing = await db.arenaQuiz.findUnique({
      where: { id: quizId },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    const role = normalizeRole(session.user.role as string);
    if (existing.authorId !== session.user.id && role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden: Not your quiz" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      courseId,
      status = "DRAFT",
      defaultTimeLimitSeconds = 20,
      scoringMethod = "SPEED_BASED",
      enableIntegrityMonitoring = false,
      shuffleQuestions = false,
      shuffleAnswers = false,
      showLeaderboardAfterEach = true,
      questions = [],
    } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ message: "Quiz title is required" }, { status: 400 });
    }

    // Validation for published status
    if (status === "PUBLISHED") {
      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json(
          { message: "At least one question is required to publish a quiz." },
          { status: 400 }
        );
      }

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i] as QuestionInput;
        if (!q.questionText || !q.questionText.trim()) {
          return NextResponse.json(
            { message: `Question #${i + 1} is missing question text.` },
            { status: 400 }
          );
        }
        if (!q.choices || q.choices.length < 2) {
          return NextResponse.json(
            { message: `Question #${i + 1} must have at least 2 choices.` },
            { status: 400 }
          );
        }
        const hasCorrect = q.choices.some((c) => c.isCorrect);
        if (!hasCorrect) {
          return NextResponse.json(
            { message: `Question #${i + 1} must have at least one correct answer marked.` },
            { status: 400 }
          );
        }
      }
    }

    // Replace questions atomically inside a transaction
    await db.$transaction(async (tx) => {
      const baseUpdateData: Record<string, unknown> = {
        title: title.trim(),
        description: description?.trim() || null,
        courseId: courseId || null,
        status: status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        defaultTimeLimitSeconds: Number(defaultTimeLimitSeconds) || 20,
        scoringMethod: scoringMethod === "ACCURACY_BASED" ? "ACCURACY_BASED" : "SPEED_BASED",
        enableIntegrityMonitoring: Boolean(enableIntegrityMonitoring),
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleAnswers: Boolean(shuffleAnswers),
        showLeaderboardAfterEach: Boolean(showLeaderboardAfterEach),
      };

      await tx.arenaQuiz.update({
        where: { id: quizId },
        data: baseUpdateData as any,
      });

      // Clear existing questions and choices to replace with updated set
      await tx.arenaQuestion.deleteMany({
        where: { quizId },
      });

      if (Array.isArray(questions) && questions.length > 0) {
        for (let qIdx = 0; qIdx < questions.length; qIdx++) {
          const q = questions[qIdx] as QuestionInput;
          await tx.arenaQuestion.create({
            data: {
              quizId,
              questionText: (q.questionText || "").trim(),
              questionType: q.questionType === "TRUE_FALSE" ? "TRUE_FALSE" : "MULTIPLE_CHOICE",
              mediaUrl: q.mediaUrl || null,
              timeLimitSeconds: Number(q.timeLimitSeconds) || 20,
              basePoints: Number(q.basePoints) || 1000,
              speedBonusEnabled: q.speedBonusEnabled ?? true,
              explanation: q.explanation?.trim() || null,
              orderIndex: qIdx,
              choices: {
                create: (Array.isArray(q.choices) ? q.choices : []).map((c: ChoiceInput, cIdx: number) => ({
                  choiceText: (c.choiceText || "").trim(),
                  isCorrect: Boolean(c.isCorrect),
                  colorIndex: c.colorIndex !== undefined ? c.colorIndex : cIdx % 4,
                  orderIndex: cIdx,
                })),
              },
            },
          });
        }
      }
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    return NextResponse.json({ success: true, quizId });
  } catch (error) {
    console.error("PUT_ARENA_QUIZ_ERROR", error);
    return NextResponse.json({
      message: "Failed to update quiz",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

/**
 * DELETE /api/arena/quizzes/[quizId]
 * Delete a quiz and its questions/choices.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;
    const existing = await db.arenaQuiz.findUnique({
      where: { id: quizId },
      select: { id: true, authorId: true },
    });

    if (!existing) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    const role = normalizeRole(session.user.role as string);
    if (existing.authorId !== session.user.id && role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden: Not your quiz" }, { status: 403 });
    }

    await db.arenaQuiz.delete({
      where: { id: quizId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_ARENA_QUIZ_ERROR", error);
    return NextResponse.json({ message: "Failed to delete quiz" }, { status: 500 });
  }
}
