import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireMockInterviewStudent,
  sameOriginViolation,
  denied,
} from "@/lib/mock-interview/access";
import { PREDEFINED_SCENARIOS } from "@/lib/mock-interview/content-bank";
import { ensureMockInterviewTablesAndContent } from "@/lib/mock-interview/server-db";

export async function POST(request: Request) {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  try {
    const body = await request.json();
    const scenarioId = String(body.scenarioId || "").trim();
    const selectedQuestionId = String(body.selectedQuestionId || "").trim();
    const classifiedAnswer = String(body.classifiedAnswer || "").trim();
    const selectedFollowUpId = body.selectedFollowUpId ? String(body.selectedFollowUpId).trim() : null;

    if (!scenarioId || !selectedQuestionId || !classifiedAnswer) {
      return NextResponse.json(
        { message: "scenarioId, selectedQuestionId, and classifiedAnswer are required." },
        { status: 400 }
      );
    }

    const scenario = PREDEFINED_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json({ message: "Scenario not found." }, { status: 404 });
    }

    const qOpt = scenario.questionOptions.find((q) => q.id === selectedQuestionId);
    const isQuestionCorrect = !!qOpt?.isBest;

    const preparedAnswer = scenario.applicantAnswers[selectedQuestionId];
    const isClassificationCorrect = preparedAnswer ? preparedAnswer.classification === classifiedAnswer : false;

    let isFollowUpCorrect: boolean | null = null;
    if (selectedFollowUpId && scenario.followUpOptions) {
      const fuOpt = scenario.followUpOptions.find((f) => f.id === selectedFollowUpId);
      isFollowUpCorrect = !!fuOpt?.isBest;
    }

    let score = 0;
    if (isQuestionCorrect) score += 35;
    if (isClassificationCorrect) score += 35;
    if (isFollowUpCorrect) score += 30;
    const maxScore = 100;

    let attemptRecord;
    try {
      attemptRecord = await db.mockInterviewRecruiterAttempt.create({
        data: {
          studentId: access.userId,
          scenarioId,
          selectedQuestionId,
          classifiedAnswer,
          selectedFollowUpId,
          isQuestionCorrect,
          isClassificationCorrect,
          isFollowUpCorrect,
          score,
          maxScore,
        },
      });
    } catch (createErr) {
      console.warn("Retrying recruiter attempt save after ensure:", createErr);
      await ensureMockInterviewTablesAndContent();
      attemptRecord = await db.mockInterviewRecruiterAttempt.create({
        data: {
          studentId: access.userId,
          scenarioId,
          selectedQuestionId,
          classifiedAnswer,
          selectedFollowUpId,
          isQuestionCorrect,
          isClassificationCorrect,
          isFollowUpCorrect,
          score,
          maxScore,
        },
      });
    }

    return NextResponse.json({
      success: true,
      attemptId: attemptRecord.id,
      score,
      maxScore,
      isQuestionCorrect,
      isClassificationCorrect,
      isFollowUpCorrect,
      advice: scenario.practicalAdvice,
    });
  } catch (err) {
    return NextResponse.json({ message: "Internal error" }, { status: 500 });
  }
}
