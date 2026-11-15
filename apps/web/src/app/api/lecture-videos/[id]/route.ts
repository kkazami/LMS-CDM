import { NextResponse } from "next/server";
import { requireLectureVideosApiActor } from "@/lib/lecture-videos/guard";
import { classifyLectureVideoApiError } from "@/lib/lecture-videos/lectures";
import {
  LectureVideosHttpError,
  deleteIteLectureVideo,
  getIteLectureVideoById,
  updateIteLectureVideo,
} from "@/lib/lecture-videos/service";

export const dynamic = "force-dynamic";

function toErrorResponse(err: unknown, routeContext: string) {
  console.error(`[${routeContext}] Request failed:`, err);
  const classified = classifyLectureVideoApiError(err);
  return NextResponse.json(
    {
      message: classified.message,
      error: classified.message,
      code: classified.kind,
    },
    { status: classified.status }
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lecture-videos/[id]
 * Fetches a single lecture by ID, enforcing course-level visibility:
 * - Student must have an APPROVED enrollment in the lecture's course.
 * - Instructor must teach the lecture's course.
 * - Admin can view any active ITE lecture.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireLectureVideosApiActor(request);
    const { id } = await context.params;
    const lecture = await getIteLectureVideoById(actor, id);
    return NextResponse.json({ lecture });
  } catch (err) {
    return toErrorResponse(err, "GET /api/lecture-videos/[id]");
  }
}

/**
 * PATCH /api/lecture-videos/[id]
 * Edits title, description, and subject (`courseId`) of a lecture (uploader faculty or ITE admin only).
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireLectureVideosApiActor(request, [
      "INSTRUCTOR",
      "ADMIN",
    ]);
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new LectureVideosHttpError(400, "Invalid JSON request body.");
    }

    const lecture = await updateIteLectureVideo(actor, id, {
      title: body.title,
      description: body.description,
      courseId: body.courseId,
    });

    return NextResponse.json({ lecture });
  } catch (err) {
    return toErrorResponse(err, "PATCH /api/lecture-videos/[id]");
  }
}

/**
 * DELETE /api/lecture-videos/[id]
 * Deletes a lecture, removes its stored video from Blob (if UPLOAD), and cascades progress rows.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireLectureVideosApiActor(request, [
      "INSTRUCTOR",
      "ADMIN",
    ]);
    const { id } = await context.params;
    const result = await deleteIteLectureVideo(actor, id);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err, "DELETE /api/lecture-videos/[id]");
  }
}
