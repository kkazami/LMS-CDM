import { NextResponse } from "next/server";
import { requireLectureVideosApiActor } from "@/lib/lecture-videos/guard";
import { classifyLectureVideoApiError } from "@/lib/lecture-videos/lectures";
import {
  LectureVideosHttpError,
  createIteLectureVideo,
  listActorIteCourses,
  listIteLectureVideos,
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

/**
 * GET /api/lecture-videos
 * Lists recorded lectures visible to the current ITE actor (enrolled courses for students,
 * taught courses for instructors, all active ITE courses for admins), plus the actor's course list.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireLectureVideosApiActor(request);
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const [lectures, courses] = await Promise.all([
      listIteLectureVideos(actor, { courseId }),
      listActorIteCourses(actor),
    ]);
    return NextResponse.json({ lectures, courses });
  } catch (err) {
    return toErrorResponse(err, "GET /api/lecture-videos");
  }
}

/**
 * POST /api/lecture-videos
 * Creates a recorded lecture assigned to a required ITE course (faculty/admin only).
 */
export async function POST(request: Request) {
  try {
    const actor = await requireLectureVideosApiActor(request, [
      "INSTRUCTOR",
      "ADMIN",
    ]);

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new LectureVideosHttpError(400, "Invalid JSON request body.");
    }

    const lecture = await createIteLectureVideo(actor, {
      title: body.title,
      description: body.description,
      courseId: body.courseId,
      sourceType: body.sourceType,
      externalUrl: body.externalUrl,
      fileUrl: typeof body.fileUrl === "string" ? body.fileUrl : "",
      fileName: typeof body.fileName === "string" ? body.fileName : "",
      durationSeconds:
        typeof body.durationSeconds === "number"
          ? body.durationSeconds
          : undefined,
    });

    return NextResponse.json({ lecture }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err, "POST /api/lecture-videos");
  }
}
