import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireMockInterviewStudent,
  sameOriginViolation,
  denied,
} from "@/lib/mock-interview/access";
import { ensureMockInterviewTablesAndContent } from "@/lib/mock-interview/server-db";

export async function POST(request: Request) {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  let questionId = "";
  let writtenAnswer = "";
  let checklist: Record<string, unknown> = {};
  let notes: string | null = null;

  try {
    const body = await request.json();
    questionId = String(body.questionId || "").trim();
    writtenAnswer = String(body.writtenAnswer || "").trim();
    checklist = body.checklist || {};
    notes = body.notes ? String(body.notes).trim() : null;

    if (!questionId || !writtenAnswer) {
      return NextResponse.json(
        { message: "questionId and writtenAnswer are required." },
        { status: 400 }
      );
    }

    const attempt = await db.mockInterviewApplicantAttempt.create({
      data: {
        studentId: access.userId,
        questionId,
        writtenAnswer,
        checklistAssessment: checklist as any,
        feedbackNotes: notes,
      },
    });

    return NextResponse.json({ success: true, attemptId: attempt.id });
  } catch (err) {
    console.warn("Retrying applicant attempt save after ensure:", err);
    await ensureMockInterviewTablesAndContent();
    try {
      const retryAttempt = await db.mockInterviewApplicantAttempt.create({
        data: {
          studentId: access.userId,
          questionId,
          writtenAnswer,
          checklistAssessment: checklist as any,
          feedbackNotes: notes,
        },
      });
      return NextResponse.json({ success: true, attemptId: retryAttempt.id });
    } catch (retryErr) {
      console.error("Failed to save applicant attempt:", retryErr);
      return NextResponse.json({ message: "Failed to persist attempt." }, { status: 500 });
    }
  }
}
