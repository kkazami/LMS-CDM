import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/admin-types";
import ArenaQuizEditor from "@/components/arena/ArenaQuizEditor";
import type { ArenaQuestionType, ArenaScoringMethod } from "@/types/arena";

export const dynamic = "force-dynamic";

export default async function EditArenaQuizPage({
  params,
}: {
  params: Promise<{ institute: string; quizId: string }>;
}) {
  const { institute, quizId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = normalizeRole(session.user.role as string);
  if (role !== "INSTRUCTOR" && role !== "ADMIN") {
    redirect(`/${institute}/arena`);
  }

  const quiz = await db.arenaQuiz.findUnique({
    where: { id: quizId },
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
  });

  if (!quiz) {
    notFound();
  }

  if (quiz.authorId !== session.user.id && role !== "ADMIN") {
    redirect(`/${institute}/arena`);
  }

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  const courses = instituteRecord
    ? await db.course.findMany({
        where: {
          instituteId: instituteRecord.id,
          isArchived: false,
          ...(role === "ADMIN" ? {} : { instructorId: session.user.id }),
        },
        select: { id: true, title: true, code: true },
        orderBy: { code: "asc" },
      })
    : [];

  const formattedQuiz = {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    courseId: quiz.courseId,
    defaultTimeLimitSeconds: quiz.defaultTimeLimitSeconds,
    scoringMethod: quiz.scoringMethod as ArenaScoringMethod,
    enableIntegrityMonitoring: quiz.enableIntegrityMonitoring,
    shuffleQuestions: quiz.shuffleQuestions,
    shuffleAnswers: quiz.shuffleAnswers,
    showLeaderboardAfterEach: quiz.showLeaderboardAfterEach,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType as ArenaQuestionType,
      mediaUrl: q.mediaUrl,
      timeLimitSeconds: q.timeLimitSeconds,
      basePoints: q.basePoints,
      speedBonusEnabled: q.speedBonusEnabled,
      explanation: q.explanation,
      orderIndex: q.orderIndex,
      choices: q.choices.map((c) => ({
        id: c.id,
        choiceText: c.choiceText,
        isCorrect: c.isCorrect,
        colorIndex: c.colorIndex,
        orderIndex: c.orderIndex,
      })),
    })),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ArenaQuizEditor
        instituteCode={institute}
        initialQuiz={formattedQuiz}
        courses={courses}
      />
    </div>
  );
}
