import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireMockInterviewStudent,
  denied,
} from "@/lib/mock-interview/access";
import { PREDEFINED_QUESTIONS, PREDEFINED_SCENARIOS } from "@/lib/mock-interview/content-bank";
import { ensureMockInterviewTablesAndContent } from "@/lib/mock-interview/server-db";

export async function GET(request: Request) {
  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  try {
    const [applicantAttempts, recruiterAttempts, quizAttempts] = await Promise.all([
      db.mockInterviewApplicantAttempt.findMany({
        where: { studentId: access.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      db.mockInterviewRecruiterAttempt.findMany({
        where: { studentId: access.userId },
        orderBy: { completedAt: "desc" },
        take: 30,
      }),
      db.mockInterviewQuizAttempt.findMany({
        where: { studentId: access.userId },
        orderBy: { completedAt: "desc" },
        take: 30,
      }),
    ]);

    const formattedApplicant = applicantAttempts.map((a) => {
      const q = PREDEFINED_QUESTIONS.find((item) => item.id === a.questionId);
      return {
        id: a.id,
        type: "APPLICANT" as const,
        title: q ? q.questionText : "Applicant Mode Practice",
        date: a.createdAt.toISOString(),
        details: {
          writtenAnswer: a.writtenAnswer,
          checklist: a.checklistAssessment,
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
        answers: q.userAnswers,
      },
    }));

    const allAttempts = [...formattedApplicant, ...formattedRecruiter, ...formattedQuiz].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      totalQuestionsPracticed: applicantAttempts.length,
      totalSessionsCompleted: allAttempts.length,
      quizzesCompleted: quizAttempts.length,
      recentAttempts: allAttempts,
    });
  } catch (err) {
    await ensureMockInterviewTablesAndContent();
    return NextResponse.json({
      totalQuestionsPracticed: 0,
      totalSessionsCompleted: 0,
      quizzesCompleted: 0,
      recentAttempts: [],
    });
  }
}
