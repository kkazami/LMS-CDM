import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import FormRenderer from "@/components/forms/renderer/FormRenderer";
import { shuffleQuestionsAndOptions } from "@/lib/forms/shuffle";
import type { FormData, FormQuestionData, FormAttemptData, FormAttemptAnswerData } from "@/types/forms";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
    formId: string;
  }>;
  searchParams?: Promise<{
    retake?: string;
  }>;
}

export default async function FormRespondPage({ params, searchParams }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/forms/[formId]/respond/page.tsx", await params);

  const { institute, courseId, formId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isRetakeRequested = resolvedSearchParams.retake === "true";
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string).toUpperCase();
  const isStudent = role === "STUDENT";

  // Concurrently fetch enrollment, form details, and all user attempts in parallel
  const [enrollment, form, existingAttempts] = await Promise.all([
    isStudent
      ? db.enrollment.findUnique({
          where: {
            courseId_studentId: { courseId, studentId: session.user.id },
          },
          select: { status: true },
        })
      : Promise.resolve({ status: "APPROVED" }),
    db.form.findUnique({
      where: { id: formId },
      include: {
        sections: { orderBy: { position: "asc" } },
        questions: { orderBy: { position: "asc" } },
      },
    }),
    db.formAttempt.findMany({
      where: { formId, userId: session.user.id },
      orderBy: { attemptNumber: "desc" },
      include: { answers: true },
    }),
  ]);

  if (isStudent && (!enrollment || enrollment.status !== "APPROVED")) {
    redirect(`/${institute}/courses/${courseId}`);
  }

  if (!form || form.courseId !== courseId) {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  // Find or create active attempt
  let attempt = existingAttempts.find((a) => a.status === "IN_PROGRESS");
  const previousCount = existingAttempts.length;
  const lastAttempt = existingAttempts[0];
  const canRetake = previousCount < form.maxAttempts;

  if (!attempt) {
    if (lastAttempt && lastAttempt.status === "SUBMITTED" && !isRetakeRequested) {
      // Viewing submitted result; do not create a new attempt unless explicitly requested
      attempt = lastAttempt;
    } else if (canRetake) {
      // Create new attempt
      const deadlineAt = form.timeLimitMins
        ? new Date(Date.now() + form.timeLimitMins * 60 * 1000)
        : null;

      attempt = await db.formAttempt.create({
        data: {
          formId,
          userId: session.user.id,
          attemptNumber: previousCount + 1,
          status: "IN_PROGRESS",
          deadlineAt,
        },
        include: { answers: true },
      });
    } else {
      // Reached limit, show completed result
      attempt = lastAttempt;
    }
  }

  const theme = getInstituteTheme(institute);

  // Sanitize questions for student view
  const rawQuestions: FormQuestionData[] = form.questions.map((q) => {
    let cfg = {};
    try {
      cfg = JSON.parse(q.config || "{}");
    } catch {}

    const options = (cfg as { options?: Array<{ id: string; text: string; imageUrl?: string }> }).options;
    if (Array.isArray(options)) {
      cfg = {
        ...cfg,
        options: options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          imageUrl: opt.imageUrl,
        })),
      };
    }
    if ((cfg as { shortAnswer?: unknown }).shortAnswer) {
      cfg = {
        ...cfg,
        shortAnswer: {},
      };
    }

    return {
      ...q,
      questionType: q.questionType as FormQuestionData["questionType"],
      config: cfg,
    };
  });

  const processedQuestions = shuffleQuestionsAndOptions(
    rawQuestions,
    attempt.id,
    form.shuffleQuestions,
    form.shuffleOptions
  );

  const parsedAnswers: FormAttemptAnswerData[] = (attempt.answers || []).map((ans) => {
    let optArray: string[] | null = null;
    let rankingArray: string[] | null = null;
    let matrixMap: Record<string, string> | null = null;

    try {
      if (ans.answerOptions) optArray = JSON.parse(ans.answerOptions);
    } catch {}
    try {
      if (ans.answerRanking) rankingArray = JSON.parse(ans.answerRanking);
    } catch {}
    try {
      if (ans.answerMatrix) matrixMap = JSON.parse(ans.answerMatrix);
    } catch {}

    return {
      id: ans.id,
      attemptId: ans.attemptId,
      questionId: ans.questionId,
      answerText: ans.answerText,
      answerOptions: optArray,
      answerNumber: ans.answerNumber,
      answerDate: ans.answerDate,
      answerRanking: rankingArray,
      answerMatrix: matrixMap,
      fileUrl: ans.fileUrl,
      fileName: ans.fileName,
      fileSizeBytes: ans.fileSizeBytes,
      isCorrect: ans.isCorrect,
      pointsAwarded: ans.pointsAwarded,
      autoGraded: ans.autoGraded,
      instructorGraded: ans.instructorGraded,
      feedback: ans.feedback,
      answeredAt: ans.answeredAt,
    };
  });

  const parsedForm: FormData = {
    ...form,
    formType: form.formType as FormData["formType"],
    status: form.status as FormData["status"],
    scoreToKeep: form.scoreToKeep as FormData["scoreToKeep"],
    questions: processedQuestions,
  };

  const parsedAttempt: FormAttemptData = {
    ...attempt,
    status: attempt.status as FormAttemptData["status"],
    answers: parsedAnswers,
  };

  return (
    <FormRenderer
      form={parsedForm}
      attempt={parsedAttempt}
      courseId={courseId}
      instituteCode={institute}
      studentName={session.user.name || "Student"}
      studentEmail={session.user.email}
      theme={theme}
      canRetake={canRetake}
    />
  );
}
