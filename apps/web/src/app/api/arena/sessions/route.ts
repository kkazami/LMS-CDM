import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { normalizeRole } from "@/lib/admin-types";
import { generateArenaPin } from "@/lib/arena-scoring";

export const dynamic = "force-dynamic";

/**
 * POST /api/arena/sessions
 * Instructor launches a new live game session for a quiz.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const role = normalizeRole(session.user.role as string);
    const isInstructor = role === "INSTRUCTOR" || role === "ADMIN";

    if (!isInstructor) {
      return NextResponse.json({ message: "Forbidden: Only instructors can host live games" }, { status: 403 });
    }

    const body = await request.json();
    const { quizId, customSettings = {} } = body;

    if (!quizId) {
      return NextResponse.json({ message: "Quiz ID is required" }, { status: 400 });
    }

    const quiz = await db.arenaQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          select: { id: true, timeLimitSeconds: true },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    if (quiz.questions.length === 0) {
      return NextResponse.json(
        { message: "Cannot launch a quiz with zero questions" },
        { status: 400 }
      );
    }

    // Generate a unique 6-digit PIN that isn't currently active
    let pin = generateArenaPin();
    let collision = await db.arenaGameSession.findFirst({
      where: { pin, status: { not: "FINISHED" } },
    });
    while (collision) {
      pin = generateArenaPin();
      collision = await db.arenaGameSession.findFirst({
        where: { pin, status: { not: "FINISHED" } },
      });
    }

    // Create session
    const gameSession = await db.arenaGameSession.create({
      data: {
        quizId,
        hostId: session.user.id,
        pin,
        mode: "LIVE",
        status: "LOBBY",
        currentQuestionIndex: 0,
        scoringMethod: customSettings.scoringMethod || quiz.scoringMethod,
        enableIntegrityMonitoring:
          customSettings.enableIntegrityMonitoring ?? quiz.enableIntegrityMonitoring,
        showLeaderboardAfterEach:
          customSettings.showLeaderboardAfterEach ?? quiz.showLeaderboardAfterEach,
        showAnswerFeedback: customSettings.showAnswerFeedback || quiz.showAnswerFeedback,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: gameSession.id,
      pin: gameSession.pin,
    }, { status: 201 });
  } catch (error) {
    console.error("POST_ARENA_SESSION_ERROR", error);
    return NextResponse.json({ message: "Failed to create game session" }, { status: 500 });
  }
}

/**
 * GET /api/arena/sessions
 * List active games for student or instructor.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");

    if (pin) {
      const activeSession = await db.arenaGameSession.findFirst({
        where: { pin, status: { not: "FINISHED" } },
        select: { id: true, pin: true, status: true, quiz: { select: { title: true } } },
      });
      return NextResponse.json({ session: activeSession });
    }

    const sessions = await db.arenaGameSession.findMany({
      where: {
        hostId: session.user.id,
      },
      include: {
        quiz: {
          select: { title: true },
        },
        _count: {
          select: { participants: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("GET_ARENA_SESSIONS_ERROR", error);
    return NextResponse.json({ message: "Failed to list sessions" }, { status: 500 });
  }
}
