import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
} from "@/lib/ibe-consultation/access";
import { getStudentEnrolledSubjectsWithInstructors } from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireIbeConsultationActor(request, ["STUDENT"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const subjects = await getStudentEnrolledSubjectsWithInstructors(auth.actor);
    return NextResponse.json({ subjects });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

