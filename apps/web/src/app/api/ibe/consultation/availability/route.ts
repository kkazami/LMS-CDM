import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
  sameOriginViolation,
} from "@/lib/ibe-consultation/access";
import {
  createInstructorAvailability,
  deleteInstructorAvailability,
  getInstructorScheduleConfig,
  updateInstructorAvailability,
} from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireIbeConsultationActor(request, ["INSTRUCTOR"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const config = await getInstructorScheduleConfig(auth.actor.userId);
    return NextResponse.json({
      ...config,
      availability: config.availabilities,
    });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

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
    const availability = await createInstructorAvailability(auth.actor, {
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      slotDuration: body.slotDuration,
      maxAppointmentsPerDay: body.maxAppointmentsPerDay,
      meetingType: body.meetingType,
      location: body.location,
      meetingLink: body.meetingLink,
      isActive: body.isActive,
      isSuspended: body.isSuspended,
    });
    return NextResponse.json({ availability }, { status: 201 });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const originError = sameOriginViolation(request);
  if (originError) return originError;

  const auth = await requireIbeConsultationActor(request, ["INSTRUCTOR"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!id) {
      return NextResponse.json(
        {
          error: "Availability id is required.",
          message: "Availability id is required.",
        },
        { status: 400 }
      );
    }

    const availability = await updateInstructorAvailability(auth.actor, id, {
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      slotDuration: body.slotDuration,
      maxAppointmentsPerDay: body.maxAppointmentsPerDay,
      meetingType: body.meetingType,
      location: body.location,
      meetingLink: body.meetingLink,
      isActive: body.isActive,
      isSuspended: body.isSuspended,
    });

    return NextResponse.json({ availability });
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
          error: "Availability id is required.",
          message: "Availability id is required.",
        },
        { status: 400 }
      );
    }

    const result = await deleteInstructorAvailability(auth.actor, id);
    return NextResponse.json({
      success: true,
      preservedAppointmentsCount: result.preservedAppointmentsCount,
    });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

