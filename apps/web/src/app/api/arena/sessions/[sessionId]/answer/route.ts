import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import {
  calculateQuestionScore,
  getArenaQuizFromCache,
  setArenaQuizInCache,
  type CachedArenaQuiz,
} from "@/lib/arena-scoring";

export const dynamic = "force-dynamic";

async function loadQuizWithQuestions(quizId: string): Promise<CachedArenaQuiz | null> {
  const cached = getArenaQuizFromCache(quizId);
  if (cached) return cached;

  const quiz = await db.arenaQuiz.findUnique({
    where: { id: quizId },
    select: {
      id: true,
      title: true,
      questions: {
        select: {
          id: true,
          questionText: true,
          questionType: true,
          mediaUrl: true,
          timeLimitSeconds: true,
          basePoints: true,
          speedBonusEnabled: true,
          explanation: true,
          orderIndex: true,
          choices: {
            select: {
              id: true,
              choiceText: true,
              isCorrect: true,
              colorIndex: true,
              orderIndex: true,
            },
            orderBy: { orderIndex: "asc" },
          },
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (quiz) {
    setArenaQuizInCache(quiz);
  }
  return quiz;
}

/**
 * POST /api/arena/sessions/[sessionId]/answer
 * Student submits their answer for the currently active question.
 * The server is the sole authority on deadlines and scoring.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Capture arrival timestamp immediately before any async DB calls so serverless latency never penalizes speed bonus
    const now = Date.now();

    const [session, { sessionId }, body] = await Promise.all([
      getSession(),
      params,
      request.json(),
    ]);

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { choiceId, powerUp } = body;

    // Fetch lightweight session row and participant row in parallel
    const [gameSession, participant] = await Promise.all([
      db.arenaGameSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          quizId: true,
          status: true,
          currentQuestionIndex: true,
          currentQuestionStartedAt: true,
          currentQuestionDeadline: true,
          scoringMethod: true,
        },
      }),
      db.arenaParticipant.findUnique({
        where: {
          sessionId_studentId: {
            sessionId,
            studentId: session.user.id,
          },
        },
      }),
    ]);

    if (!gameSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    if (gameSession.status !== "QUESTION_ACTIVE") {
      return NextResponse.json(
        { message: "Question is not currently active for answers." },
        { status: 400 }
      );
    }

    if (!participant) {
      return NextResponse.json({ message: "Participant record not found." }, { status: 403 });
    }

    const quiz = await loadQuizWithQuestions(gameSession.quizId);
    const currentQuestion = quiz?.questions[gameSession.currentQuestionIndex];
    if (!currentQuestion) {
      return NextResponse.json({ message: "No active question found." }, { status: 400 });
    }

    const startedAtMs = gameSession.currentQuestionStartedAt
      ? new Date(gameSession.currentQuestionStartedAt).getTime()
      : now;
    const deadlineMs = gameSession.currentQuestionDeadline
      ? new Date(gameSession.currentQuestionDeadline).getTime()
      : now + currentQuestion.timeLimitSeconds * 1000;

    // Grace period: 1500ms network buffer + tactical power-up extensions (5s for FREEZE, 10s for ADD_TIME)
    const powerUpGraceMs = powerUp === "FREEZE" ? 5000 : powerUp === "ADD_TIME" ? 10000 : 0;
    if (now > deadlineMs + 1500 + powerUpGraceMs) {
      return NextResponse.json(
        { message: "Time has expired for this question." },
        { status: 408 }
      );
    }

    // Response time in milliseconds
    const responseTimeMs = Math.max(50, now - startedAtMs);

    // Check duplicate submission
    const existingAnswer = await db.arenaPlayerAnswer.findUnique({
      where: {
        sessionId_questionId_studentId: {
          sessionId,
          questionId: currentQuestion.id,
          studentId: session.user.id,
        },
      },
      select: { id: true },
    });

    if (existingAnswer) {
      return NextResponse.json(
        { message: "You have already submitted an answer for this question." },
        { status: 409 }
      );
    }

    // Check choice validity and correctness
    let isCorrect = false;
    if (choiceId) {
      const choice = currentQuestion.choices.find((c) => c.id === choiceId);
      if (choice && choice.isCorrect) {
        isCorrect = true;
      }
    }

    // Calculate score with optional speed and streak bonus
    const scoreResult = calculateQuestionScore({
      isCorrect,
      scoringMethod: gameSession.scoringMethod as "SPEED_BASED" | "ACCURACY_BASED",
      basePoints: currentQuestion.basePoints,
      speedBonusEnabled: currentQuestion.speedBonusEnabled,
      timeLimitSeconds: currentQuestion.timeLimitSeconds,
      responseTimeMs,
      currentStreak: participant.currentStreak,
    });

    // Apply 2x Double Points multiplier power-up if activated and answer is correct
    let finalPoints = scoreResult.totalPoints;
    if (powerUp === "DOUBLE_POINTS" && isCorrect) {
      finalPoints = scoreResult.totalPoints * 2;
    }

    // Save answer and update participant stats atomically in a transaction
    const [createdAnswer] = await db.$transaction([
      db.arenaPlayerAnswer.create({
        data: {
          sessionId,
          questionId: currentQuestion.id,
          participantId: participant.id,
          studentId: session.user.id,
          choiceId: choiceId || null,
          isCorrect,
          responseTimeMs,
          pointsEarned: finalPoints,
          integrityFlags: 0,
        },
        select: { id: true },
      }),
      db.arenaParticipant.update({
        where: { id: participant.id },
        data: {
          score: { increment: finalPoints },
          currentStreak: scoreResult.newStreak,
          lastActiveAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      answerId: createdAnswer.id,
      isCorrect,
      pointsEarned: finalPoints,
      responseTimeMs,
      powerUpApplied: powerUp ?? null,
      streak: scoreResult.newStreak,
      speedBonusEarned: scoreResult.speedBonusEarned,
      streakBonusEarned: scoreResult.streakBonusEarned,
    });
  } catch (error) {
    console.error("POST_ARENA_ANSWER_ERROR", error);
    return NextResponse.json({ message: "Failed to record answer" }, { status: 500 });
  }
}
