import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
} from "@/lib/ibe-consultation/access";
import { getInstructorAvailableSlotsForDate } from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireIbeConsultationActor(request, [
    "STUDENT",
    "INSTRUCTOR",
  ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const instructorId =
      searchParams.get("instructorId")?.trim() ||
      (auth.actor.role === "INSTRUCTOR" ? auth.actor.userId : "");
    const subjectId = searchParams.get("subjectId")?.trim() || undefined;
    const dateKey = searchParams.get("date")?.trim() || "";

    if (!instructorId || !dateKey) {
      return NextResponse.json(
        {
          error: "Both instructorId and date (YYYY-MM-DD) are required.",
          message: "Both instructorId and date (YYYY-MM-DD) are required.",
        },
        { status: 400 }
      );
    }

    const slots = await getInstructorAvailableSlotsForDate({
      actor: auth.actor,
      instructorId,
      subjectId,
      dateKey,
    });

    return NextResponse.json({ slots, dateKey, instructorId });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

