import { NextResponse } from "next/server";
import {
  consultationErrorResponse,
  requireIbeConsultationActor,
  sameOriginViolation,
} from "@/lib/ibe-consultation/access";
import {
  toManilaDateKey,
  toManilaTimeString,
} from "@/lib/ibe-consultation/rules";
import {
  getInstructorConsultationStats,
  getStudentConsultationStats,
  listAppointmentsForActor,
  submitStudentConsultationRequest,
} from "@/lib/ibe-consultation/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireIbeConsultationActor(request, [
    "STUDENT",
    "INSTRUCTOR",
  ]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "ALL";
    const search = searchParams.get("search") ?? "";
    const subjectId = searchParams.get("subjectId") ?? "ALL";
    const meetingType = searchParams.get("meetingType") ?? "ALL";
    const page = Number(searchParams.get("page") ?? "1") || 1;
    const pageSize = Number(searchParams.get("pageSize") ?? "10") || 10;

    const [listResult, stats] = await Promise.all([
      listAppointmentsForActor(auth.actor, {
        status,
        search,
        subjectId,
        meetingType,
        page,
        pageSize,
      }),
      auth.actor.role === "STUDENT"
        ? getStudentConsultationStats(auth.actor.userId)
        : getInstructorConsultationStats(auth.actor.userId),
    ]);

    return NextResponse.json({
      ...listResult,
      items: listResult.appointments,
      stats,
      studentStats: auth.actor.role === "STUDENT" ? stats : undefined,
      instructorStats: auth.actor.role === "INSTRUCTOR" ? stats : undefined,
    });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const originError = sameOriginViolation(request);
  if (originError) return originError;

  const auth = await requireIbeConsultationActor(request, ["STUDENT"]);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let subjectId = "";
    let instructorId = "";
    let availabilityId: string | null = null;
    let title = "";
    let reason = "";
    let additionalMessage: string | null = null;
    let preferredDate = "";
    let startTime = "";
    let endTime = "";
    let requestedStartAt = "";
    let requestedEndAt = "";
    let meetingType = "FACE_TO_FACE";
    let attachmentFile: {
      originalFileName: string;
      declaredMimeType: string;
      bytes: Uint8Array;
    } | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      subjectId = String(formData.get("subjectId") ?? "").trim();
      instructorId = String(formData.get("instructorId") ?? "").trim();
      availabilityId =
        String(formData.get("availabilityId") ?? "").trim() || null;
      title = String(formData.get("title") ?? "").trim();
      reason = String(formData.get("reason") ?? "").trim();
      additionalMessage =
        String(formData.get("additionalMessage") ?? "").trim() || null;
      preferredDate = String(formData.get("preferredDate") ?? "").trim();
      startTime = String(formData.get("startTime") ?? "").trim();
      endTime = String(formData.get("endTime") ?? "").trim();
      requestedStartAt = String(formData.get("requestedStartAt") ?? "").trim();
      requestedEndAt = String(formData.get("requestedEndAt") ?? "").trim();
      meetingType = String(formData.get("meetingType") ?? "FACE_TO_FACE").trim();

      const fileEntry = formData.get("file") ?? formData.get("attachment");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        const ab = await fileEntry.arrayBuffer();
        attachmentFile = {
          originalFileName: fileEntry.name,
          declaredMimeType: fileEntry.type,
          bytes: new Uint8Array(ab),
        };
      }
    } else {
      const body = (await request.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      subjectId = String(body.subjectId ?? "").trim();
      instructorId = String(body.instructorId ?? "").trim();
      availabilityId =
        typeof body.availabilityId === "string" && body.availabilityId.trim()
          ? body.availabilityId.trim()
          : null;
      title = String(body.title ?? "").trim();
      reason = String(body.reason ?? "").trim();
      additionalMessage =
        typeof body.additionalMessage === "string" &&
        body.additionalMessage.trim()
          ? body.additionalMessage.trim()
          : null;
      preferredDate = String(body.preferredDate ?? "").trim();
      startTime = String(body.startTime ?? "").trim();
      endTime = String(body.endTime ?? "").trim();
      requestedStartAt = String(body.requestedStartAt ?? "").trim();
      requestedEndAt = String(body.requestedEndAt ?? "").trim();
      meetingType = String(body.meetingType ?? "FACE_TO_FACE").trim();
    }

    if ((!preferredDate || !startTime) && requestedStartAt) {
      const startDt = new Date(requestedStartAt);
      if (!isNaN(startDt.getTime())) {
        if (!preferredDate) preferredDate = toManilaDateKey(startDt);
        if (!startTime) startTime = toManilaTimeString(startDt);
      }
    }
    if (!endTime && requestedEndAt) {
      const endDt = new Date(requestedEndAt);
      if (!isNaN(endDt.getTime())) {
        endTime = toManilaTimeString(endDt);
      }
    }

    const appointment = await submitStudentConsultationRequest(auth.actor, {
      subjectId,
      instructorId,
      availabilityId,
      title,
      reason,
      additionalMessage,
      preferredDate,
      startTime,
      endTime,
      meetingType,
      attachmentFile,
    });

    const stats = await getStudentConsultationStats(auth.actor.userId);

    return NextResponse.json({ appointment, stats }, { status: 201 });
  } catch (error) {
    return consultationErrorResponse(error);
  }
}

