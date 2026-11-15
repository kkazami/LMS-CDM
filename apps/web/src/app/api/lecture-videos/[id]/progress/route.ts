import { NextResponse } from "next/server";
import { requireLectureVideosApiActor } from "@/lib/lecture-videos/guard";
import {
  LectureVideosHttpError,
  getFacultyLectureProgress,
  recordStudentLectureProgress,
} from "@/lib/lecture-videos/service";

export const dynamic = "force-dynamic";

function toErrorResponse(err: unknown) {
  if (err instanceof LectureVideosHttpError) {
    return NextResponse.json({ message: err.message }, { status: err.status });
  }
  if (
    err &&
    typeof err === "object" &&
    "status" in err &&
    typeof (err as { status: unknown }).status === "number"
  ) {
    const status = (err as { status: number }).status;
    const message =
      "message" in err && typeof (err as { message: unknown }).message === "string"
        ? (err as { message: string }).message
        : "Request failed.";
    return NextResponse.json({ message }, { status });
  }
  return NextResponse.json(
    { message: "An unexpected error occurred." },
    { status: 500 }
  );
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lecture-videos/[id]/progress
 * Faculty/admin only: returns the full ITE student progress report for the selected lecture,
 * joining against the ITE student list so students who never opened the lecture appear as "Not started".
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireLectureVideosApiActor(request, [
      "INSTRUCTOR",
      "ADMIN",
    ]);
    const { id } = await context.params;
    const report = await getFacultyLectureProgress(actor, id);
    return NextResponse.json({ report });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/lecture-videos/[id]/progress
 * Lightweight endpoint protected by the ITE guard where an ITE student can only write their own progress.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await requireLectureVideosApiActor(request, ["STUDENT"]);
    const { id } = await context.params;

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      throw new LectureVideosHttpError(400, "Invalid JSON request body.");
    }

    const progress = await recordStudentLectureProgress(actor, id, {
      lastPositionSeconds:
        typeof body.lastPositionSeconds === "number"
          ? body.lastPositionSeconds
          : Number(body.lastPositionSeconds),
      watchedSeconds:
        typeof body.watchedSeconds === "number"
          ? body.watchedSeconds
          : Number(body.watchedSeconds),
      durationSeconds:
        typeof body.durationSeconds === "number"
          ? body.durationSeconds
          : Number(body.durationSeconds),
      studentId:
        typeof body.studentId === "string" ? body.studentId : undefined,
    });

    return NextResponse.json({ progress });
  } catch (err) {
    return toErrorResponse(err);
  }
}

