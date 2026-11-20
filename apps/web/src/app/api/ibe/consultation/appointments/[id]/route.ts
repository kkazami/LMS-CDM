import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
  sameOriginViolation,
} from "@/lib/ibe-consultation/access";
import {
  toManilaDateKey,
  toManilaTimeString,
  type AppointmentMutationAction,
} from "@/lib/ibe-consultation/rules";
import {
  getAppointmentDetailsForActor,
  getInstructorConsultationStats,
  getStudentConsultationStats,
  mutateAppointmentStatus,
} from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireIbeConsultationActor(request, [
    "STUDENT",
    "INSTRUCTOR",
  ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const appointment = await getAppointmentDetailsForActor(auth.actor, id);
    return NextResponse.json({ appointment });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const originError = sameOriginViolation(request);
  if (originError) return originError;

  const auth = await requireIbeConsultationActor(request, [
    "STUDENT",
    "INSTRUCTOR",
  ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const action = String(body.action ?? "")
      .trim()
      .toUpperCase() as AppointmentMutationAction;

    let proposedDateKey =
      typeof body.proposedDateKey === "string"
        ? body.proposedDateKey.trim()
        : undefined;
    let proposedStartTime =
      typeof body.proposedStartTime === "string"
        ? body.proposedStartTime.trim()
        : undefined;
    let proposedEndTime =
      typeof body.proposedEndTime === "string"
        ? body.proposedEndTime.trim()
        : undefined;

    if (
      (!proposedDateKey || !proposedStartTime) &&
      typeof body.proposedStartAt === "string" &&
      body.proposedStartAt.trim()
    ) {
      const st = new Date(body.proposedStartAt.trim());
      if (!isNaN(st.getTime())) {
        if (!proposedDateKey) proposedDateKey = toManilaDateKey(st);
        if (!proposedStartTime) proposedStartTime = toManilaTimeString(st);
      }
    }
    if (
      !proposedEndTime &&
      typeof body.proposedEndAt === "string" &&
      body.proposedEndAt.trim()
    ) {
      const et = new Date(body.proposedEndAt.trim());
      if (!isNaN(et.getTime())) {
        proposedEndTime = toManilaTimeString(et);
      }
    }

    const appointment = await mutateAppointmentStatus(auth.actor, {
      appointmentId: id,
      action,
      instructorResponse:
        typeof body.instructorResponse === "string"
          ? body.instructorResponse
          : undefined,
      rejectionReason:
        typeof body.rejectionReason === "string"
          ? body.rejectionReason
          : undefined,
      cancellationReason:
        typeof body.cancellationReason === "string"
          ? body.cancellationReason
          : undefined,
      proposedDateKey,
      proposedStartTime,
      proposedEndTime,
      meetingLocation:
        typeof body.meetingLocation === "string"
          ? body.meetingLocation
          : undefined,
      meetingLink:
        typeof body.meetingLink === "string" ? body.meetingLink : undefined,
    });

    const stats =
      auth.actor.role === "STUDENT"
        ? await getStudentConsultationStats(auth.actor.userId)
        : await getInstructorConsultationStats(auth.actor.userId);

    return NextResponse.json({ appointment, stats });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

