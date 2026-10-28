import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { normalizeRole } from "@/lib/admin-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/arena/sessions/[sessionId]/report
 * Retrieve comprehensive post-quiz analytics report.
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
            course: {
              select: { id: true, title: true, code: true },
            },
            questions: {
              include: {
                choices: true,
              },
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        participants: {
          include: {
            student: {
              select: { id: true, name: true, email: true, studentNumber: true },
            },
            playerAnswers: {
              include: {
                choice: true,
              },
            },
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

    const questions = gameSession.quiz.questions;
    const totalQuestions = questions.length;

    // Per-student summary
    const studentReports = gameSession.participants.map((p, idx) => {
      const answers = p.playerAnswers;
      const correctCount = answers.filter((a) => a.isCorrect).length;
      const incorrectCount = totalQuestions - correctCount;
      const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const totalResponseTimeMs = answers.reduce((acc, a) => acc + a.responseTimeMs, 0);
      const avgResponseTimeSec =
        answers.length > 0 ? (totalResponseTimeMs / answers.length / 1000).toFixed(1) : "0.0";
      const totalIntegrityFlags = answers.reduce((acc, a) => acc + a.integrityFlags, 0);

      return {
        participantId: p.id,
        studentId: p.student.id,
        name: p.student.name,
        nickname: p.nickname,
        email: p.student.email,
        studentNumber: p.student.studentNumber,
        rank: idx + 1,
        totalScore: p.score,
        correctCount,
        incorrectCount,
        accuracy,
        avgResponseTimeSec,
        integrityFlags: totalIntegrityFlags,
      };
    });

    // Per-question difficulty breakdown
    const questionReports = questions.map((q) => {
      const allAnswersForQ = gameSession.participants.flatMap((p) =>
        p.playerAnswers.filter((a) => a.questionId === q.id)
      );

      const totalAnswered = allAnswersForQ.length;
      const totalCorrect = allAnswersForQ.filter((a) => a.isCorrect).length;
      const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
      const avgTimeMs =
        totalAnswered > 0
          ? Math.round(allAnswersForQ.reduce((acc, a) => acc + a.responseTimeMs, 0) / totalAnswered)
          : 0;

      // Choice distribution
      const choiceStats = q.choices.map((c) => {
        const count = allAnswersForQ.filter((a) => a.choiceId === c.id).length;
        const percentage = totalAnswered > 0 ? Math.round((count / totalAnswered) * 100) : 0;
        return {
          choiceId: c.id,
          choiceText: c.choiceText,
          isCorrect: c.isCorrect,
          colorIndex: c.colorIndex,
          count,
          percentage,
        };
      });

      return {
        questionId: q.id,
        questionText: q.questionText,
        questionType: q.questionType,
        orderIndex: q.orderIndex,
        totalAnswered,
        totalCorrect,
        successRate,
        avgTimeSec: (avgTimeMs / 1000).toFixed(1),
        choices: choiceStats,
      };
    });

    // Class overall averages
    const totalStudents = studentReports.length;
    const classAvgScore =
      totalStudents > 0
        ? Math.round(studentReports.reduce((acc, s) => acc + s.totalScore, 0) / totalStudents)
        : 0;
    const classAvgAccuracy =
      totalStudents > 0
        ? Math.round(studentReports.reduce((acc, s) => acc + s.accuracy, 0) / totalStudents)
        : 0;

    return NextResponse.json({
      session: {
        id: gameSession.id,
        pin: gameSession.pin,
        quizTitle: gameSession.quiz.title,
        quizDescription: gameSession.quiz.description,
        course: gameSession.quiz.course,
        startedAt: gameSession.startedAt,
        endedAt: gameSession.endedAt,
        scoringMethod: gameSession.scoringMethod,
        enableIntegrityMonitoring: false,
        status: gameSession.status,
      },
      stats: {
        totalStudents,
        totalQuestions,
        classAvgScore,
        classAvgAccuracy,
      },
      students: studentReports,
      questions: questionReports,
      isHost,
    });
  } catch (error) {
    console.error("GET_ARENA_REPORT_ERROR", error);
    return NextResponse.json({ message: "Failed to load report" }, { status: 500 });
  }
}

/**
 * POST /api/arena/sessions/[sessionId]/report
 * Synchronize Arena quiz results to LMS Gradebook.
 */
export async function POST(
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
            _count: {
              select: { questions: true },
            },
          },
        },
        participants: {
          include: {
            playerAnswers: true,
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
      return NextResponse.json({ message: "Forbidden: Host only" }, { status: 403 });
    }

    if (!gameSession.quiz.courseId) {
      return NextResponse.json(
        { message: "This quiz is not linked to a specific course. Assign a course before syncing to gradebook." },
        { status: 400 }
      );
    }

    const courseId = gameSession.quiz.courseId;
    const itemTitle = `[Arena] ${gameSession.quiz.title} (Game #${gameSession.pin})`;
    const totalQuestions = Math.max(1, gameSession.quiz._count.questions);

    // Reuse existing SyllabusItem if already synced for this game PIN, or create a new one
    let syllabusItem = await db.syllabusItem.findFirst({
      where: {
        courseId,
        title: itemTitle,
      },
      select: { id: true },
    });

    if (!syllabusItem) {
      syllabusItem = await db.syllabusItem.create({
        data: {
          courseId,
          title: itemTitle,
          type: "QUIZ",
          maxPoints: 100,
          enableIntegrityMonitoring: false,
        },
        select: { id: true },
      });
    } else {
      await db.studentSubmission.deleteMany({
        where: { syllabusItemId: syllabusItem.id },
      });
    }

    const now = new Date();
    if (gameSession.participants.length > 0) {
      await db.studentSubmission.createMany({
        data: gameSession.participants.map((participant) => {
          const answers = participant.playerAnswers;
          const correct = answers.filter((a) => a.isCorrect).length;
          const gradeScore = Math.round((correct / totalQuestions) * 100);
          return {
            syllabusItemId: syllabusItem.id,
            studentId: participant.studentId,
            grade: gradeScore,
            status: "GRADED",
            submittedAt: now,
          };
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${gameSession.participants.length} student scores to the course gradebook.`,
      syllabusItemId: syllabusItem.id,
    });
  } catch (error) {
    console.error("SYNC_ARENA_GRADEBOOK_ERROR", error);
    return NextResponse.json({ message: "Failed to sync to gradebook" }, { status: 500 });
  }
}
