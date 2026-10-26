import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/admin-types";
import ArenaReportClient from "@/components/arena/ArenaReportClient";

export const dynamic = "force-dynamic";

export default async function ArenaReportPage({
  params,
}: {
  params: Promise<{ institute: string; sessionId: string }>;
}) {
  const { institute, sessionId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

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
    notFound();
  }

  const role = normalizeRole(session.user.role as string);
  const isHost = gameSession.hostId === session.user.id || role === "ADMIN";

  const questions = gameSession.quiz.questions;
  const totalQuestions = questions.length;

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

  const totalStudents = studentReports.length;
  const classAvgScore =
    totalStudents > 0
      ? Math.round(studentReports.reduce((acc, s) => acc + s.totalScore, 0) / totalStudents)
      : 0;
  const classAvgAccuracy =
    totalStudents > 0
      ? Math.round(studentReports.reduce((acc, s) => acc + s.accuracy, 0) / totalStudents)
      : 0;

  const reportData = {
    session: {
      id: gameSession.id,
      pin: gameSession.pin,
      quizTitle: gameSession.quiz.title,
      quizDescription: gameSession.quiz.description,
      course: gameSession.quiz.course,
      startedAt: gameSession.startedAt?.toISOString() || null,
      endedAt: gameSession.endedAt?.toISOString() || null,
      scoringMethod: gameSession.scoringMethod,
      enableIntegrityMonitoring: gameSession.enableIntegrityMonitoring,
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
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ArenaReportClient
        sessionId={sessionId}
        instituteCode={institute}
        reportData={reportData}
      />
    </div>
  );
}
