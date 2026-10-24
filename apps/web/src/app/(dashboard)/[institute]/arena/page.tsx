import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/admin-types";
import ArenaHubClient from "@/components/arena/ArenaHubClient";
import type { ArenaQuizDetail, ArenaQuestionType, ArenaScoringMethod } from "@/types/arena";

export const dynamic = "force-dynamic";

export default async function ArenaHubPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = normalizeRole(session.user.role as string);
  if (role === "ADMIN") {
    redirect(`/${institute}/admin`);
  }
  const isInstructor = role === "INSTRUCTOR";

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  if (!instituteRecord) {
    redirect(`/${institute}/students`);
  }

  // Fetch quizzes
  const rawQuizzes = await db.arenaQuiz.findMany({
    where: {
      instituteId: instituteRecord.id,
      ...(isInstructor
        ? { authorId: session.user.id }
        : { status: "PUBLISHED" }),
    },
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
      _count: {
        select: { questions: true, sessions: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Fetch recent sessions for instructor
  const rawSessions = isInstructor
    ? await db.arenaGameSession.findMany({
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
        take: 15,
      })
    : [];

  // Fetch student past games
  const studentPastGames = !isInstructor
    ? await db.arenaParticipant.findMany({
        where: {
          studentId: session.user.id,
        },
        include: {
          session: {
            include: {
              quiz: {
                select: { title: true },
              },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: 15,
      })
    : [];

  const formattedQuizzes: ArenaQuizDetail[] = rawQuizzes.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    coverImage: q.coverImage,
    courseId: q.courseId,
    instituteId: q.instituteId,
    authorId: q.authorId,
    status: q.status as "DRAFT" | "PUBLISHED" | "ARCHIVED",
    defaultTimeLimitSeconds: q.defaultTimeLimitSeconds,
    scoringMethod: q.scoringMethod as ArenaScoringMethod,
    enableIntegrityMonitoring: q.enableIntegrityMonitoring,
    shuffleQuestions: q.shuffleQuestions,
    shuffleAnswers: q.shuffleAnswers,
    showLeaderboardAfterEach: q.showLeaderboardAfterEach,
    showAnswerFeedback: q.showAnswerFeedback,
    allowReconnection: q.allowReconnection,
    createdAt: q.createdAt.toISOString(),
    updatedAt: q.updatedAt.toISOString(),
    course: q.course,
    author: q.author,
    questions: q.questions.map((qn) => ({
      id: qn.id,
      questionText: qn.questionText,
      questionType: qn.questionType as ArenaQuestionType,
      mediaUrl: qn.mediaUrl,
      timeLimitSeconds: qn.timeLimitSeconds,
      basePoints: qn.basePoints,
      speedBonusEnabled: qn.speedBonusEnabled,
      explanation: qn.explanation,
      orderIndex: qn.orderIndex,
      choices: qn.choices.map((c) => ({
        id: c.id,
        choiceText: c.choiceText,
        isCorrect: c.isCorrect,
        colorIndex: c.colorIndex,
        orderIndex: c.orderIndex,
      })),
    })),
    _count: q._count,
  }));

  const formattedSessions = rawSessions.map((s) => ({
    id: s.id,
    pin: s.pin,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    quiz: s.quiz,
    _count: s._count,
  }));

  const formattedPastGames = studentPastGames.map((g) => ({
    id: g.id,
    score: g.score,
    rank: g.rank,
    session: {
      id: g.session.id,
      pin: g.session.pin,
      status: g.session.status,
      quiz: g.session.quiz,
      createdAt: g.session.createdAt.toISOString(),
    },
  }));

  const activeStudentParticipant = !isInstructor
    ? await db.arenaParticipant.findFirst({
        where: {
          studentId: session.user.id,
          session: {
            status: { not: "FINISHED" },
          },
        },
        include: {
          session: {
            include: {
              quiz: { select: { title: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      })
    : null;

  const activeSession = isInstructor
    ? formattedSessions.find((s) => s.status !== "FINISHED") || null
    : activeStudentParticipant
    ? {
        id: activeStudentParticipant.session.id,
        pin: activeStudentParticipant.session.pin,
        status: activeStudentParticipant.session.status,
        createdAt: activeStudentParticipant.session.createdAt.toISOString(),
        quiz: activeStudentParticipant.session.quiz,
        _count: { participants: 0 },
      }
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ArenaHubClient
        instituteCode={institute}
        isInstructor={isInstructor}
        quizzes={formattedQuizzes}
        recentSessions={formattedSessions}
        studentPastGames={formattedPastGames}
        activeSession={activeSession}
      />
    </div>
  );
}
