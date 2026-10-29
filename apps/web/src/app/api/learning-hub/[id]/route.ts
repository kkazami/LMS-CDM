import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  loadOwnedLearningRecord,
  requireLearningHubStudent,
  sameOriginViolation,
  toStudentLearningRecord,
} from "@/lib/learning-hub/access";
import { validateLearningRecordInput } from "@/lib/learning-hub/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const access = await requireLearningHubStudent(request);
  if (!access.ok) return denied(access);

  const { id } = await context.params;
  const owned = await loadOwnedLearningRecord(id, access.userId);
  if (!owned) {
    return NextResponse.json(
      { message: "Learning record not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({ record: toStudentLearningRecord(owned) });
}

export async function PUT(request: Request, context: RouteContext) {
  const csrf = sameOriginViolation(request);
  if (csrf) return csrf;

  const access = await requireLearningHubStudent(request);
  if (!access.ok) return denied(access);

  const { id } = await context.params;
  const owned = await loadOwnedLearningRecord(id, access.userId);
  if (!owned) {
    return NextResponse.json(
      { message: "Learning record not found." },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const validated = validateLearningRecordInput(body, owned);
  if (!validated.ok) {
    return NextResponse.json({ message: validated.message }, { status: 400 });
  }

  const { status, completedAt, certificateUrl, notes, markOpened } =
    validated.data;

  const updated = await db.ibeLearningRecord.update({
    where: { id: owned.id },
    data: {
      status,
      completedAt,
      certificateUrl,
      notes,
      verificationType: "SELF_REPORTED",
      ...(markOpened ? { lastOpenedAt: new Date() } : {}),
    },
  });

  return NextResponse.json({ record: toStudentLearningRecord(updated) });
}

export async function DELETE(request: Request, context: RouteContext) {
  const csrf = sameOriginViolation(request);
  if (csrf) return csrf;

  const access = await requireLearningHubStudent(request);
  if (!access.ok) return denied(access);

  const { id } = await context.params;
  const owned = await loadOwnedLearningRecord(id, access.userId);
  if (!owned) {
    return NextResponse.json(
      { message: "Learning record not found." },
      { status: 404 }
    );
  }

  await db.ibeLearningRecord.delete({
    where: { id: owned.id },
  });

  return NextResponse.json({ ok: true });
}

