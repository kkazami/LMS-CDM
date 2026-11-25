import { requireFormAccess } from '@/lib/forms/access';
import { getFormLiveMonitorSnapshot } from '@/lib/forms/live-monitor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import FormLiveMonitorClient, {
  type FormMonitorTab,
} from "@/components/forms/results/FormLiveMonitorClient";
import type { FormAnalyticsData, QuestionAnalyticsItem, QuestionType } from "@/types/forms";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
    formId: string;
  }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function FormResponsesPage({ params, searchParams }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/forms/[formId]/responses/page.tsx", await params);

  const { institute, courseId, formId } = await params;
  const { tab = "table" } = await searchParams;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  try { await requireFormAccess(session.user, courseId, formId, true); } catch { redirect(`/${institute}/courses/${courseId}/classwork`); }
  const role = canonicalRole(session.user.role);
  if (role !== "INSTRUCTOR" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const [form, snapshot] = await Promise.all([
    db.form.findUnique({
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
    }),
    getFormLiveMonitorSnapshot(courseId, formId),
  ]);

  if (!form || form.courseId !== courseId || !snapshot) {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const theme = getInstituteTheme(institute);

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

  const initialTab: FormMonitorTab =
    tab === "integrity"
      ? "integrity"
      : tab === "analytics"
      ? "analytics"
      : "submissions";

  return (
    <div className="py-4">
      <FormLiveMonitorClient
        initialSnapshot={snapshot}
        analytics={analyticsData}
        courseId={courseId}
        formId={formId}
        instituteCode={institute}
        theme={theme}
        initialTab={initialTab}
      />
    </div>
  );
}
