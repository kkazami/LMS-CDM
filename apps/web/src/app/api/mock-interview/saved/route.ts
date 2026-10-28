import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireMockInterviewStudent,
  sameOriginViolation,
  denied,
} from "@/lib/mock-interview/access";
import { ensureMockInterviewTablesAndContent } from "@/lib/mock-interview/server-db";

export async function GET(request: Request) {
  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  try {
    const saved = await db.mockInterviewSavedQuestion.findMany({
      where: { studentId: access.userId },
      select: { questionId: true },
    });
    return NextResponse.json({
      savedQuestionIds: saved.map((s) => s.questionId),
    });
  } catch (err) {
    await ensureMockInterviewTablesAndContent();
    const saved = await db.mockInterviewSavedQuestion.findMany({
      where: { studentId: access.userId },
      select: { questionId: true },
    });
    return NextResponse.json({
      savedQuestionIds: saved.map((s) => s.questionId),
    });
  }
}

export async function POST(request: Request) {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  let questionId = "";
  try {
    const body = await request.json();
    questionId = String(body.questionId || "").trim();
    if (!questionId) {
      return NextResponse.json({ message: "Invalid questionId" }, { status: 400 });
    }

    await db.mockInterviewSavedQuestion.upsert({
      where: {
        studentId_questionId: {
          studentId: access.userId,
          questionId,
        },
      },
      create: {
        studentId: access.userId,
        questionId,
      },
      update: {},
    });

    return NextResponse.json({ success: true, saved: true });
  } catch (err) {
    await ensureMockInterviewTablesAndContent();
    if (questionId) {
      try {
        await db.mockInterviewSavedQuestion.upsert({
          where: {
            studentId_questionId: {
              studentId: access.userId,
              questionId,
            },
          },
          create: {
            studentId: access.userId,
            questionId,
          },
          update: {},
        });
      } catch (retryErr) {
        console.error("Failed to save mock interview question after ensure:", retryErr);
        return NextResponse.json({ message: "Failed to save question." }, { status: 500 });
      }
    }
    return NextResponse.json({ success: true, saved: true });
  }
}

export async function DELETE(request: Request) {
  const violation = sameOriginViolation(request);
  if (violation) return violation;

  const access = await requireMockInterviewStudent(request);
  if (!access.ok) return denied(access);

  try {
    const body = await request.json();
    const questionId = String(body.questionId || "").trim();
    if (!questionId) {
      return NextResponse.json({ message: "Invalid questionId" }, { status: 400 });
    }

    await db.mockInterviewSavedQuestion.deleteMany({
      where: {
        studentId: access.userId,
        questionId,
      },
    });

    return NextResponse.json({ success: true, removed: true });
  } catch (err) {
    return NextResponse.json({ success: true, removed: true });
  }
}
