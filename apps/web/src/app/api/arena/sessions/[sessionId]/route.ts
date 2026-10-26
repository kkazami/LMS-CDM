import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { normalizeRole } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/arena/sessions/[sessionId]
 * Fetch current state of a live game session.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    const gameSession = await db.arenaGameSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              include: {
                choices: {
                  orderBy: { orderIndex: "asc" },
                },
              },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        participants: {
          select: {
            id: true,
            studentId: true,
            nickname: true,
            avatar: true,
            score: true,
            rank: true,
            currentStreak: true,
            isConnected: true,
          },
          orderBy: { score: "desc" },
        },
      },
    });

    if (!gameSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    const role = normalizeRole(session.user.role as string);
    const isHost = gameSession.hostId === session.user.id || role === "ADMIN";

    // Auto-update student heartbeat / connection timestamp (throttled to at most once per 15s to prevent Neon pool exhaustion)
    if (!isHost) {
      const fifteenSecondsAgo = new Date(Date.now() - 15000);
      await db.arenaParticipant.updateMany({
        where: {
          sessionId,
          studentId: session.user.id,
          lastActiveAt: { lt: fifteenSecondsAgo },
        },
        data: { isConnected: true, lastActiveAt: new Date() },
      });
    }

    const currentQuestion = gameSession.quiz.questions[gameSession.currentQuestionIndex] || null;

    // Check if the current user has already answered this question
    let myAnswer = null;
    if (currentQuestion) {
      myAnswer = await db.arenaPlayerAnswer.findUnique({
        where: {
          sessionId_questionId_studentId: {
            sessionId,
            questionId: currentQuestion.id,
            studentId: session.user.id,
          },
        },
        select: {
          id: true,
          choiceId: true,
          isCorrect: true,
          pointsEarned: true,
          responseTimeMs: true,
          submittedAt: true,
        },
      });
    }

    // Tally number of answers submitted for current question
    let answeredCount = 0;
    let distribution: Record<string, number> = {};
    let answerBreakdown: Array<{
      participantId: string;
      nickname: string;
      choiceId: string | null;
      isCorrect: boolean;
      pointsEarned: number;
    }> = [];

    if (currentQuestion) {
      const answers = await db.arenaPlayerAnswer.findMany({
        where: { sessionId, questionId: currentQuestion.id },
        select: {
          participantId: true,
          choiceId: true,
          isCorrect: true,
          pointsEarned: true,
          participant: {
            select: { nickname: true },
          },
        },
      });

      answeredCount = answers.length;

      // Group distribution by choice ID
      for (const a of answers) {
        if (a.choiceId) {
          distribution[a.choiceId] = (distribution[a.choiceId] || 0) + 1;
        }
      }

      if (isHost && gameSession.status !== "QUESTION_ACTIVE") {
        answerBreakdown = answers.map((a) => ({
          participantId: a.participantId,
          nickname: a.participant.nickname,
          choiceId: a.choiceId,
          isCorrect: a.isCorrect,
          pointsEarned: a.pointsEarned,
        }));
      }
    }

    // Build question payload
    let questionPayload = null;
    if (currentQuestion) {
      const shouldRevealCorrectness = isHost || gameSession.status !== "QUESTION_ACTIVE";

      questionPayload = {
        id: currentQuestion.id,
        questionText: currentQuestion.questionText,
        questionType: currentQuestion.questionType,
        mediaUrl: currentQuestion.mediaUrl,
        timeLimitSeconds: currentQuestion.timeLimitSeconds,
        basePoints: currentQuestion.basePoints,
        orderIndex: currentQuestion.orderIndex,
        choices: currentQuestion.choices.map((c) => ({
          id: c.id,
          choiceText: c.choiceText,
          colorIndex: c.colorIndex,
          orderIndex: c.orderIndex,
          ...(shouldRevealCorrectness ? { isCorrect: c.isCorrect } : {}),
        })),
        explanation: shouldRevealCorrectness ? currentQuestion.explanation : null,
      };
    }

    // Rank participants dynamically based on current total scores
    const rankedLeaderboard = gameSession.participants.map((p, idx) => ({
      ...p,
      rank: idx + 1,
    }));

    return NextResponse.json({
      sessionId: gameSession.id,
      pin: gameSession.pin,
      quizTitle: gameSession.quiz.title,
      mode: gameSession.mode,
      status: gameSession.status,
      currentQuestionIndex: gameSession.currentQuestionIndex,
      totalQuestions: gameSession.quiz.questions.length,
      scoringMethod: gameSession.scoringMethod,
      enableIntegrityMonitoring: gameSession.enableIntegrityMonitoring,
      showLeaderboardAfterEach: gameSession.showLeaderboardAfterEach,
      startedAt: gameSession.startedAt,
      currentQuestionStartedAt: gameSession.currentQuestionStartedAt,
      currentQuestionDeadline: gameSession.currentQuestionDeadline,
      currentQuestion: questionPayload,
      participantsCount: gameSession.participants.length,
      answeredCount,
      distribution: isHost || gameSession.status !== "QUESTION_ACTIVE" ? distribution : {},
      answerBreakdown: isHost && gameSession.status !== "QUESTION_ACTIVE" ? answerBreakdown : [],
      leaderboard: rankedLeaderboard,
      myAnswer,
      isHost,
    });
  } catch (error) {
    console.error("GET_ARENA_SESSION_STATE_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch session state" }, { status: 500 });
  }
}

/**
 * PATCH /api/arena/sessions/[sessionId]
 * Host controls state transitions (start game, close question, leaderboard, next question, finish, kick).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const gameSession = await db.arenaGameSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
      },
    });

    if (!gameSession) {
      return NextResponse.json({ message: "Session not found" }, { status: 404 });
    }

    const role = normalizeRole(session.user.role as string);
    const isHost = gameSession.hostId === session.user.id || role === "ADMIN";

    if (!isHost) {
      return NextResponse.json({ message: "Forbidden: Host controls only" }, { status: 403 });
    }

    const body = await request.json();
    const { action, participantIdToKick } = body;

    const questions = gameSession.quiz.questions;
    const now = new Date();

    if (action === "KICK_PARTICIPANT" && participantIdToKick) {
      await db.arenaParticipant.delete({
        where: { id: participantIdToKick },
      });
      return NextResponse.json({ success: true, message: "Participant removed." });
    }

    if (action === "START_GAME") {
      if (questions.length === 0) {
        return NextResponse.json({ message: "Quiz has no questions" }, { status: 400 });
      }

      const firstQ = questions[0];
      const deadline = new Date(now.getTime() + firstQ.timeLimitSeconds * 1000);

      await db.arenaGameSession.update({
        where: { id: sessionId },
        data: {
          status: "QUESTION_ACTIVE",
          currentQuestionIndex: 0,
          startedAt: now,
          currentQuestionStartedAt: now,
          currentQuestionDeadline: deadline,
        },
      });

      return NextResponse.json({ success: true, status: "QUESTION_ACTIVE" });
    }

    if (action === "END_QUESTION") {
      // Closes answer submissions and shows question results & answer distribution
      await db.arenaGameSession.update({
        where: { id: sessionId },
        data: {
          status: "QUESTION_RESULT",
          currentQuestionDeadline: now, // Expire deadline immediately
        },
      });

      return NextResponse.json({ success: true, status: "QUESTION_RESULT" });
    }

    if (action === "SHOW_LEADERBOARD") {
      await db.arenaGameSession.update({
        where: { id: sessionId },
        data: {
          status: "LEADERBOARD",
        },
      });

      return NextResponse.json({ success: true, status: "LEADERBOARD" });
    }

    if (action === "NEXT_QUESTION") {
      const nextIdx = gameSession.currentQuestionIndex + 1;
      if (nextIdx >= questions.length) {
        // Quiz is finished!
        await db.arenaGameSession.update({
          where: { id: sessionId },
          data: {
            status: "FINISHED",
            endedAt: now,
          },
        });
        return NextResponse.json({ success: true, status: "FINISHED" });
      }

      const nextQ = questions[nextIdx];
      const deadline = new Date(now.getTime() + nextQ.timeLimitSeconds * 1000);

      await db.arenaGameSession.update({
        where: { id: sessionId },
        data: {
          status: "QUESTION_ACTIVE",
          currentQuestionIndex: nextIdx,
          currentQuestionStartedAt: now,
          currentQuestionDeadline: deadline,
        },
      });

      return NextResponse.json({ success: true, status: "QUESTION_ACTIVE", currentQuestionIndex: nextIdx });
    }

    if (action === "FINISH_GAME") {
      await db.arenaGameSession.update({
        where: { id: sessionId },
        data: {
          status: "FINISHED",
          endedAt: now,
        },
      });

      return NextResponse.json({ success: true, status: "FINISHED" });
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("PATCH_ARENA_SESSION_ERROR", error);
    return NextResponse.json({ message: "Failed to update session state" }, { status: 500 });
  }
}

/**
 * DELETE /api/arena/sessions/[sessionId]
 * - If Host or Admin: deletes the entire game session and its history.
 * - If Student: deletes the student's participant record, removing it from their history / active session.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;
    const gameSession = await db.arenaGameSession.findUnique({
      where: { id: sessionId },
      select: { id: true, hostId: true, status: true },
    });

    if (!gameSession) {
      // If session is already gone, also clear any student participant record
      await db.arenaParticipant.deleteMany({
        where: { sessionId, studentId: session.user.id },
      });
      return NextResponse.json({ success: true, message: "Session removed." });
    }

    const role = normalizeRole(session.user.role as string);
    const isHost = gameSession.hostId === session.user.id || role === "ADMIN";

    if (isHost) {
      // Host permanently deletes the entire session
      await db.arenaGameSession.delete({
        where: { id: sessionId },
      });
      return NextResponse.json({ success: true, message: "Game session permanently deleted." });
    }

    // Students are not permitted to delete completed match records to preserve academic history
    if (gameSession.status === "FINISHED") {
      return NextResponse.json(
        { message: "Completed quiz history cannot be removed." },
        { status: 403 }
      );
    }

    // Student leaves or cancels an ongoing uncompleted active session
    await db.arenaParticipant.deleteMany({
      where: { sessionId, studentId: session.user.id },
    });

    return NextResponse.json({ success: true, message: "Left active game session." });
  } catch (error) {
    console.error("DELETE_ARENA_SESSION_ERROR", error);
    return NextResponse.json({ message: "Failed to delete session" }, { status: 500 });
  }
}
