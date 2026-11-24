import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
  sameOriginViolation,
} from "@/lib/ibe-consultation/access";
import {
  addAppointmentMessage,
  getAppointmentDetailsForActor,
} from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function POST(
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
    const rawMessage = typeof body.message === "string" ? body.message : "";
    const message = await addAppointmentMessage(auth.actor, id, rawMessage);
    const appointment = await getAppointmentDetailsForActor(auth.actor, id);
    return NextResponse.json({ message, appointment }, { status: 201 });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

