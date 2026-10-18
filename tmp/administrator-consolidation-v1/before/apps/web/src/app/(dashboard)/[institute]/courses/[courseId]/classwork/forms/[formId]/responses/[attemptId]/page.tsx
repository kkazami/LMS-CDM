import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import ResponseDetail from "@/components/forms/results/ResponseDetail";
import type { FormAttemptAnswerData, FormQuestionData } from "@/types/forms";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
    formId: string;
    attemptId: string;
  }>;
}

export default async function StudentResponseDetailPage({ params }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/forms/[formId]/responses/[attemptId]/page.tsx");

  const { institute, courseId, formId, attemptId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const attempt = await db.formAttempt.findUnique({
    where: { id: attemptId },
    include: {
      form: {
        include: {
          questions: { orderBy: { position: "asc" } },
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          studentNumber: true,
          avatarUrl: true,
        },
      },
      answers: true,
    },
  });

  if (!attempt || attempt.formId !== formId || attempt.form.courseId !== courseId) {
    redirect(`/${institute}/courses/${courseId}/classwork/forms/${formId}/responses`);
  }

  const theme = getInstituteTheme(institute);

  const answersMap = new Map<string, (typeof attempt.answers)[0]>();
  attempt.answers.forEach((a) => answersMap.set(a.questionId, a));

  const questionsWithAnswers = attempt.form.questions.map((q) => {
    let cfg = {};
    try {
      cfg = JSON.parse(q.config || "{}");
    } catch {}

    const ans = answersMap.get(q.id);
    let optArray: string[] | null = null;
    let rankingArray: string[] | null = null;
    let matrixMap: Record<string, string> | null = null;

    if (ans) {
      try {
        if (ans.answerOptions) optArray = JSON.parse(ans.answerOptions);
      } catch {}
      try {
        if (ans.answerRanking) rankingArray = JSON.parse(ans.answerRanking);
      } catch {}
      try {
        if (ans.answerMatrix) matrixMap = JSON.parse(ans.answerMatrix);
      } catch {}
    }

    return {
      ...q,
      questionType: q.questionType as FormQuestionData["questionType"],
      config: cfg,
      answer: ans
        ? ({
            ...ans,
            answerOptions: optArray,
            answerRanking: rankingArray,
            answerMatrix: matrixMap,
          } as FormAttemptAnswerData)
        : null,
    };
  });

  const formattedAttempt = {
    ...attempt,
    questionsWithAnswers,
  };

  return (
    <ResponseDetail
      attempt={formattedAttempt as any}
      courseId={courseId}
      formId={formId}
      instituteCode={institute}
      theme={theme}
    />
  );
}
