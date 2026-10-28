import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { normalizeRole } from "@/lib/admin-types";
import type { ArenaQuestionType } from "@/types/arena";

export const dynamic = "force-dynamic";

interface ChoiceInput {
  choiceText: string;
  isCorrect: boolean;
  colorIndex?: number;
}

interface QuestionInput {
  questionText: string;
  questionType?: ArenaQuestionType;
  timeLimitSeconds?: number;
  basePoints?: number;
  speedBonusEnabled?: boolean;
  explanation?: string | null;
  choices?: ChoiceInput[];
}

/**
 * GET /api/arena/quizzes
 * List quizzes for the user's institute.
 * - Instructors / Admins: see their own created quizzes (or all if admin)
 * - Students: see all published quizzes for their institute / course
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instituteCode = searchParams.get("institute") || "ibe";
    const courseId = searchParams.get("courseId");

    const institute = await db.institute.findUnique({
      where: { code: instituteCode.toLowerCase() },
      select: { id: true },
    });

    if (!institute) {
      return NextResponse.json({ message: "Institute not found" }, { status: 404 });
    }

    const role = normalizeRole(session.user.role as string);
    const isInstructor = role === "INSTRUCTOR" || role === "ADMIN";

    const whereClause: Record<string, unknown> = {
      instituteId: institute.id,
    };

    if (courseId) {
      whereClause.courseId = courseId;
    }

    if (isInstructor) {
      if (role !== "ADMIN") {
        whereClause.authorId = session.user.id;
      }
    } else {
      whereClause.status = "PUBLISHED";
    }

    const quizzes = await db.arenaQuiz.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        course: {
          select: { id: true, title: true, code: true },
        },
        _count: {
          select: { questions: true, sessions: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("GET_ARENA_QUIZZES_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * POST /api/arena/quizzes
 * Create a new Arena quiz with questions and choices atomically.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = normalizeRole(session.user.role as string);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden: Instructors only" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      courseId,
      instituteCode = "ibe",
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

    const institute = await db.institute.findUnique({
      where: { code: instituteCode.toLowerCase() },
      select: { id: true },
    });

    if (!institute) {
      return NextResponse.json({ message: "Institute not found" }, { status: 404 });
    }

    // Validation for published quizzes
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
            { message: `Question #${i + 1} is empty.` },
            { status: 400 }
          );
        }

        const choices = q.choices || [];
        const filledChoices = choices.filter((c) => c.choiceText && c.choiceText.trim().length > 0);
        if (filledChoices.length < 2) {
          return NextResponse.json(
            { message: `Question #${i + 1} must have at least 2 answer choices.` },
            { status: 400 }
          );
        }

        const hasCorrect = filledChoices.some((c) => c.isCorrect);
        if (!hasCorrect) {
          return NextResponse.json(
            { message: `Question #${i + 1} has no correct answer marked.` },
            { status: 400 }
          );
        }
      }
    }

    // Atomic creation via Prisma nested write (avoids transaction timeout with large question sets)
    const baseQuizData = {
      title: title.trim(),
      description: description?.trim() || null,
      courseId: courseId || null,
      instituteId: institute.id,
      authorId: session.user.id,
      status,
      defaultTimeLimitSeconds: Number(defaultTimeLimitSeconds) || 20,
      scoringMethod,
      enableIntegrityMonitoring: false,
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleAnswers: Boolean(shuffleAnswers),
      showLeaderboardAfterEach: Boolean(showLeaderboardAfterEach),
    };

    const newQuiz = await db.arenaQuiz.create({
      data: {
        ...(baseQuizData as any),
        questions: {
          create: (Array.isArray(questions) ? questions : []).map((q: QuestionInput, qIdx: number) => ({
            questionText: (q.questionText || "").trim(),
            questionType: q.questionType || "MULTIPLE_CHOICE",
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
          })),
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, quizId: newQuiz.id }, { status: 201 });
  } catch (error) {
    console.error("POST_ARENA_QUIZ_ERROR", error);
    return NextResponse.json({
      message: "Failed to create quiz",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
