import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
  sameOriginViolation,
} from "@/lib/ibe-consultation/access";
import {
  createInstructorBlockedDate,
  deleteInstructorBlockedDate,
} from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const originError = sameOriginViolation(request);
  if (originError) return originError;

  const auth = await requireIbeConsultationActor(request, ["INSTRUCTOR"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const blockedDate = await createInstructorBlockedDate(auth.actor, {
      dateKey: body.dateKey,
      startAt: body.startAt,
      endAt: body.endAt,
      reason: body.reason,
    });
    return NextResponse.json({ blockedDate }, { status: 201 });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const originError = sameOriginViolation(request);
  if (originError) return originError;

  const auth = await requireIbeConsultationActor(request, ["INSTRUCTOR"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id")?.trim() || "";
    if (!id) {
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      id = typeof body.id === "string" ? body.id.trim() : "";
    }
    if (!id) {
      return NextResponse.json(
        {
          error: "Blocked date id is required.",
          message: "Blocked date id is required.",
        },
        { status: 400 }
      );
    }

    await deleteInstructorBlockedDate(auth.actor, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

