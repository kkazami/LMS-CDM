import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  ensureLearningHubTable,
  requireLearningHubStudent,
  sameOriginViolation,
  toStudentLearningRecord,
} from "@/lib/learning-hub/access";
import {
  EXTERNAL_COURSE_CATALOG,
  IBE_SUBJECT_CATEGORIES,
  LEARNING_PROVIDERS,
} from "@/lib/learning-hub/catalog";
import { validateLearningRecordInput } from "@/lib/learning-hub/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const access = await requireLearningHubStudent(request);
    if (!access.ok) return denied(access);

    await ensureLearningHubTable().catch(() => {});

    const rows = await db.ibeLearningRecord.findMany({
      where: { studentId: access.userId },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json({
      providers: LEARNING_PROVIDERS,
      subjects: IBE_SUBJECT_CATEGORIES,
      courses: EXTERNAL_COURSE_CATALOG,
      records: rows.map(toStudentLearningRecord),
    });
  } catch (error) {
    console.error("GET_LEARNING_HUB_ERROR", error);
    return NextResponse.json(
      { message: "Failed to load learning hub records." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const csrf = sameOriginViolation(request);
    if (csrf) return csrf;

    const access = await requireLearningHubStudent(request);
    if (!access.ok) return denied(access);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    await ensureLearningHubTable().catch(() => {});

    const rawCourseId =
      body && typeof body === "object" && typeof (body as Record<string, unknown>).courseId === "string"
        ? ((body as Record<string, unknown>).courseId as string).trim()
        : "";

    const existing = rawCourseId
      ? await db.ibeLearningRecord.findUnique({
          where: {
            studentId_courseId: {
              studentId: access.userId,
              courseId: rawCourseId,
            },
          },
        })
      : null;

    const validated = validateLearningRecordInput(body, existing ?? undefined);
    if (!validated.ok) {
      return NextResponse.json({ message: validated.message }, { status: 400 });
    }

    const { courseId, status, completedAt, certificateUrl, notes, markOpened } =
      validated.data;

    const saved = await db.ibeLearningRecord.upsert({
      where: {
        studentId_courseId: {
          studentId: access.userId,
          courseId,
        },
      },
      create: {
        studentId: access.userId,
        instituteId: access.instituteId,
        courseId,
        status,
        completedAt,
        certificateUrl,
        notes,
        verificationType: "SELF_REPORTED",
        lastOpenedAt: markOpened ? new Date() : null,
      },
      update: {
        status,
        completedAt,
        certificateUrl,
        notes,
        verificationType: "SELF_REPORTED",
        ...(markOpened ? { lastOpenedAt: new Date() } : {}),
      },
    });

    return NextResponse.json(
      { record: toStudentLearningRecord(saved) },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    console.error("POST_LEARNING_HUB_ERROR", error);
    return NextResponse.json(
      { message: "Failed to save learning hub record." },
      { status: 500 }
    );
  }
}
