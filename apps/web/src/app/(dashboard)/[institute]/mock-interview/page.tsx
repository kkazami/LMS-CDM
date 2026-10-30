import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isMockInterviewEligible } from "@/lib/mock-interview/eligibility";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import { PREDEFINED_QUESTIONS, PREDEFINED_SCENARIOS } from "@/lib/mock-interview/content-bank";
import MockInterviewHubClient from "@/components/mock-interview/MockInterviewHubClient";
import type { StoredAttemptItem } from "@/components/mock-interview/AttemptReviewModal";

export const dynamic = "force-dynamic";

export default async function MockInterviewPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?institute=${institute}`);
  }

  // Strictly enforce: Student role only, and IBE institute only.
  // Instructors, admins, and other institutes cannot access this feature.
  if (!isMockInterviewEligible(session.user) || institute.toLowerCase() !== "ibe") {
    notFound();
  }

  const theme = getInstituteTheme(institute);

  // Directly load student's saved questions and attempts on the server
  let initialAttempts: StoredAttemptItem[] = [];
  let initialSavedQuestionIds: string[] = [];

  try {
    if (
      "mockInterviewApplicantAttempt" in db &&
      "mockInterviewRecruiterAttempt" in db &&
      "mockInterviewQuizAttempt" in db &&
      "mockInterviewSavedQuestion" in db
    ) {
      const [applicantAttempts, recruiterAttempts, quizAttempts, saved] = await Promise.all([
        db.mockInterviewApplicantAttempt.findMany({
        where: { studentId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.mockInterviewRecruiterAttempt.findMany({
        where: { studentId: session.user.id },
        orderBy: { completedAt: "desc" },
        take: 30,
      }),
      db.mockInterviewQuizAttempt.findMany({
        where: { studentId: session.user.id },
        orderBy: { completedAt: "desc" },
        take: 30,
      }),
      db.mockInterviewSavedQuestion.findMany({
        where: { studentId: session.user.id },
        select: { questionId: true },
      }),
    ]);

    initialSavedQuestionIds = saved.map((s) => s.questionId);

    const formattedApplicant = applicantAttempts.map((a) => {
      const q = PREDEFINED_QUESTIONS.find((item) => item.id === a.questionId);
      return {
        id: a.id,
        type: "APPLICANT" as const,
        title: q ? q.questionText : "Applicant Mode Practice",
        date: a.createdAt.toISOString(),
        details: {
          writtenAnswer: a.writtenAnswer,
          checklist: a.checklistAssessment as any,
          notes: a.feedbackNotes,
          questionId: a.questionId,
        },
      };
    });

    const formattedRecruiter = recruiterAttempts.map((r) => {
      const scen = PREDEFINED_SCENARIOS.find((s) => s.id === r.scenarioId);
      return {
        id: r.id,
        type: "RECRUITER" as const,
        title: scen ? `Recruiter: ${scen.title}` : "Recruiter Simulation",
        date: r.completedAt.toISOString(),
        score: r.score,
        maxScore: r.maxScore,
        details: {
          scenarioId: r.scenarioId,
          selectedQuestionId: r.selectedQuestionId,
          classifiedAnswer: r.classifiedAnswer,
          isQuestionCorrect: r.isQuestionCorrect,
          isClassificationCorrect: r.isClassificationCorrect,
          isFollowUpCorrect: r.isFollowUpCorrect,
        },
      };
    });

    const formattedQuiz = quizAttempts.map((q) => ({
      id: q.id,
      type: "QUIZ" as const,
      title: `Quick Interview Quiz (${q.correctAnswers}/${q.totalQuestions})`,
      date: q.completedAt.toISOString(),
      score: q.score,
      maxScore: q.maxScore,
      details: {
        correctAnswers: q.correctAnswers,
        totalQuestions: q.totalQuestions,
        percentage: q.percentage,
        answers: q.userAnswers as any,
      },
    }));

    initialAttempts = [...formattedApplicant, ...formattedRecruiter, ...formattedQuiz].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    }
  } catch (err) {
    console.error("Failed to load initial mock interview records:", err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <MockInterviewHubClient
        instituteCode={institute}
        studentName={session.user.name || "Student"}
        studentId={session.user.id}
        theme={theme}
        initialAttempts={initialAttempts}
        initialSavedQuestionIds={initialSavedQuestionIds}
      />
    </div>
  );
}
