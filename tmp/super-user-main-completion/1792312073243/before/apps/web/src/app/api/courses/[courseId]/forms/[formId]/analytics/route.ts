import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import type { FormAnalyticsData, QuestionAnalyticsItem, QuestionConfig, QuestionType } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = (session.user.role as string).toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId } = await context.params;
    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        questions: { orderBy: { position: "asc" } },
        attempts: {
          where: { status: { in: ["SUBMITTED", "TIMED_OUT"] } },
          include: { answers: true },
        },
      },
    });

    if (!form || form.courseId !== courseId) {
      return NextResponse.json({ message: "Form not found." }, { status: 404 });
    }

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

    // Score distribution buckets
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

    // Question-level metrics
    const questionsAnalytics: QuestionAnalyticsItem[] = form.questions
      .filter((q) => q.questionType !== "SECTION_HEADER")
      .map((q) => {
        let cfg: QuestionConfig = {};
        try {
          cfg = JSON.parse(q.config || "{}");
        } catch {}

        let answeredCount = 0;
        let correctCount = 0;
        let totalScoreAwarded = 0;
        const optionsCounts = new Map<string, number>();

        submittedAttempts.forEach((att) => {
          const ans = att.answers.find((a) => a.questionId === q.id);
          if (ans) {
            answeredCount++;
            if (ans.isCorrect === true) {
              correctCount++;
            }
            totalScoreAwarded += ans.pointsAwarded ?? 0;

            if (ans.answerOptions) {
              try {
                const optIds: string[] = JSON.parse(ans.answerOptions);
                optIds.forEach((id) => {
                  optionsCounts.set(id, (optionsCounts.get(id) || 0) + 1);
                });
              } catch {}
            }
          }
        });

        const avgScore = answeredCount > 0 ? Math.round((totalScoreAwarded / answeredCount) * 100) / 100 : 0;
        const incorrectCount = answeredCount - correctCount;
        const difficultyPercent =
          answeredCount > 0 ? Math.round((incorrectCount / answeredCount) * 10000) / 100 : 0;

        const options = cfg.options || [];
        const optionsBreakdown = options.map((opt) => ({
          optionId: opt.id,
          text: opt.text,
          count: optionsCounts.get(opt.id) || 0,
          isCorrect: Boolean(opt.isCorrect),
        }));

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
          optionsBreakdown: options.length > 0 ? optionsBreakdown : undefined,
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

    return NextResponse.json({ analytics: analyticsData });
  } catch (error) {
    console.error("ANALYTICS_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to generate analytics." }, { status: 500 });
  }
}
