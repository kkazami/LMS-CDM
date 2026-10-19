import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import InstructorResponseTable from "@/components/forms/results/InstructorResponseTable";
import FormAnalytics from "@/components/forms/results/FormAnalytics";
import { ArrowLeft, BarChart2, ListOrdered, Edit3 } from "lucide-react";
import type { FormAnalyticsData, QuestionAnalyticsItem, QuestionConfig, QuestionType } from "@/types/forms";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
    formId: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function FormResponsesPage({ params, searchParams }: PageProps) {
  const { institute, courseId, formId } = await params;
  const { tab = "table" } = await searchParams;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const form = await db.form.findUnique({
    where: { id: formId },
    include: {
      questions: { orderBy: { position: "asc" } },
      attempts: {
        where: { status: { in: ["SUBMITTED", "TIMED_OUT"] } },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentNumber: true,
            },
          },
          answers: true,
        },
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!form || form.courseId !== courseId) {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const theme = getInstituteTheme(institute);
  const primaryColor = theme.colors.primary;

  // Compute analytics
  const submittedAttempts = form.attempts;
  const totalAttempts = submittedAttempts.length;
  const uniqueStudents = new Set(submittedAttempts.map((a) => a.userId)).size;

  const scores = submittedAttempts
    .map((a) => a.percentage ?? 0)
    .sort((a, b) => a - b);

  const averageScore =
    totalAttempts > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / totalAttempts) * 100) / 100
      : 0;

  const medianScore =
    totalAttempts > 0
      ? totalAttempts % 2 === 0
        ? Math.round(((scores[totalAttempts / 2 - 1] + scores[totalAttempts / 2]) / 2) * 100) / 100
        : scores[Math.floor(totalAttempts / 2)]
      : 0;

  const highestScore = totalAttempts > 0 ? scores[scores.length - 1] : 0;
  const lowestScore = totalAttempts > 0 ? scores[0] : 0;
  const passingCount = submittedAttempts.filter((a) => a.passed === true).length;
  const passingRate =
    totalAttempts > 0 ? Math.round((passingCount / totalAttempts) * 10000) / 100 : 0;

  const distributionBuckets = [
    { range: "0-19%", count: 0 },
    { range: "20-39%", count: 0 },
    { range: "40-59%", count: 0 },
    { range: "60-79%", count: 0 },
    { range: "80-100%", count: 0 },
  ];

  scores.forEach((s) => {
    if (s < 20) distributionBuckets[0].count++;
    else if (s < 40) distributionBuckets[1].count++;
    else if (s < 60) distributionBuckets[2].count++;
    else if (s < 80) distributionBuckets[3].count++;
    else distributionBuckets[4].count++;
  });

  const questionsAnalytics: QuestionAnalyticsItem[] = form.questions
    .filter((q) => q.questionType !== "SECTION_HEADER")
    .map((q) => {
      let answeredCount = 0;
      let correctCount = 0;
      let totalScoreAwarded = 0;

      submittedAttempts.forEach((att) => {
        const ans = att.answers.find((a) => a.questionId === q.id);
        if (ans) {
          answeredCount++;
          if (ans.isCorrect === true) correctCount++;
          totalScoreAwarded += ans.pointsAwarded ?? 0;
        }
      });

      const avgScore = answeredCount > 0 ? Math.round((totalScoreAwarded / answeredCount) * 100) / 100 : 0;
      const incorrectCount = answeredCount - correctCount;
      const difficultyPercent =
        answeredCount > 0 ? Math.round((incorrectCount / answeredCount) * 10000) / 100 : 0;

      return {
        id: q.id,
        position: q.position,
        prompt: q.prompt,
        questionType: q.questionType as QuestionType,
        points: q.points,
        answeredCount,
        correctCount,
        averageScore: avgScore,
        difficultyPercent,
      };
    });

  const analyticsData: FormAnalyticsData = {
    formId: form.id,
    title: form.title,
    totalAttempts,
    uniqueStudents,
    averageScore,
    medianScore,
    highestScore,
    lowestScore,
    passingRate,
    scoreDistribution: distributionBuckets,
    questions: questionsAnalytics,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href={`/${institute}/courses/${courseId}/classwork`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Classwork</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {form.title} — Responses
          </h1>
          <p className="text-xs text-slate-500">
            {totalAttempts} response{totalAttempts === 1 ? "" : "s"} submitted
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${institute}/courses/${courseId}/classwork/forms/${formId}/builder`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#12151E] border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-xs"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Form</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-px text-xs font-semibold">
        <Link
          href={`/${institute}/courses/${courseId}/classwork/forms/${formId}/responses?tab=table`}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            tab === "table"
              ? "border-primary text-slate-900 dark:text-white"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
          style={{ borderColor: tab === "table" ? primaryColor : undefined }}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Responses Table ({totalAttempts})</span>
        </Link>

        <Link
          href={`/${institute}/courses/${courseId}/classwork/forms/${formId}/responses?tab=analytics`}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors ${
            tab === "analytics"
              ? "border-primary text-slate-900 dark:text-white"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
          }`}
          style={{ borderColor: tab === "analytics" ? primaryColor : undefined }}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analytics & Insights</span>
        </Link>
      </div>

      {/* Tab Views */}
      {tab === "analytics" ? (
        <FormAnalytics analytics={analyticsData} theme={theme} />
      ) : (
        <InstructorResponseTable
          attempts={form.attempts as any}
          courseId={courseId}
          formId={formId}
          instituteCode={institute}
          theme={theme}
        />
      )}
    </div>
  );
}
