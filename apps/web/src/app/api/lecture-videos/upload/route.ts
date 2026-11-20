import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireLectureVideosApiActor } from "@/lib/lecture-videos/guard";
import {
  LECTURE_ALLOWED_MIME_TYPES,
  LECTURE_MAX_BYTES,
  isValidLectureUploadPathname,
  validateLectureUpload,
} from "@/lib/lecture-videos/lectures";
import {
  LectureVideosHttpError,
  cleanupUncommittedLectureBlob,
  lectureUploadsConfigured,
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
  const message =
    err instanceof Error && err.message ? err.message : "Upload failed.";
  return NextResponse.json({ message }, { status: 400 });
}

/**
 * POST /api/lecture-videos/upload
 * Issues a short-lived Vercel Blob client upload token for ITE faculty/admins only.
 * The video file itself goes directly from the browser to Vercel Blob (bypassing Vercel's ~4.5 MB route limit).
 */
export async function POST(request: Request) {
  try {
    const actor = await requireLectureVideosApiActor(request, [
      "INSTRUCTOR",
      "ADMIN",
    ]);

    if (!lectureUploadsConfigured()) {
      throw new LectureVideosHttpError(
        503,
        "File uploads are not configured."
      );
    }

    let body: HandleUploadBody;
    try {
      body = (await request.json()) as HandleUploadBody;
    } catch {
      throw new LectureVideosHttpError(400, "Invalid JSON request body.");
    }

    if (body?.type !== "blob.generate-client-token") {
      throw new LectureVideosHttpError(400, "Unsupported upload event.");
    }

    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!isValidLectureUploadPathname(pathname, actor.userId)) {
          throw new LectureVideosHttpError(400, "Invalid upload destination.");
        }
        const check = validateLectureUpload(pathname);
        if (!check.ok) {
          throw new LectureVideosHttpError(
            400,
            check.reason ?? "Invalid video file."
          );
        }

        return {
          allowedContentTypes: [...LECTURE_ALLOWED_MIME_TYPES],
          maximumSizeInBytes: LECTURE_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId: actor.userId }),
        };
      },
    });

    return NextResponse.json(response);
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/lecture-videos/upload
 * Cleans up an uncommitted Vercel Blob if the faculty cancels/closes the dialog
 * or if saving the lecture record fails after the browser upload completed.
 */
export async function DELETE(request: Request) {
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

    const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";
    const result = await cleanupUncommittedLectureBlob(actor, fileUrl);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}

