import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireLectureVideosApiActor } from "@/lib/lecture-videos/guard";
import {
  LECTURE_ALLOWED_MIME_TYPES,
  LECTURE_MAX_BYTES,
  LECTURE_UPLOADS_UNAVAILABLE_MESSAGE,
  isValidLectureUploadPathname,
  validateLectureSignature,
  validateLectureUpload,
} from "@/lib/lecture-videos/lectures";
import {
  LOCAL_LECTURE_URL_PREFIX,
  LectureVideosHttpError,
  assertLectureUploadsConfigured,
  blobLectureUploadsConfigured,
  cleanupUncommittedLectureBlob,
  localLectureUploadsConfigured,
  resolveLocalLectureFilePath,
} from "@/lib/lecture-videos/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

    assertLectureUploadsConfigured();
    if (!blobLectureUploadsConfigured()) {
      return NextResponse.json(
        { localUpload: true, message: "Use PUT /api/lecture-videos/upload for local storage." },
        { status: 422 }
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
 * PUT /api/lecture-videos/upload?pathname=ite/lecture-videos/<userId>/...&offset=0&totalSize=12345
 * Stores an uploaded lecture video in local filesystem storage (`.local-uploads/lecture-videos/`)
 * when Vercel Blob (`BLOB_READ_WRITE_TOKEN`) is not configured (e.g. local development).
 * Supports 4 MB chunked uploads so Next.js's 10 MB middleware body limit never truncates larger videos.
 */
export async function PUT(request: Request) {
  try {
    const actor = await requireLectureVideosApiActor(request, [
      "INSTRUCTOR",
      "ADMIN",
    ]);

    if (!localLectureUploadsConfigured() && !blobLectureUploadsConfigured()) {
      throw new LectureVideosHttpError(503, LECTURE_UPLOADS_UNAVAILABLE_MESSAGE);
    }

    const { searchParams } = new URL(request.url);
    const pathname = (searchParams.get("pathname") ?? "").trim();
    if (!pathname || !isValidLectureUploadPathname(pathname, actor.userId)) {
      throw new LectureVideosHttpError(400, "Invalid upload destination.");
    }

    const offsetParam = searchParams.get("offset");
    const totalSizeParam = searchParams.get("totalSize");
    const offset =
      offsetParam !== null && /^\d+$/.test(offsetParam)
        ? Number(offsetParam)
        : 0;
    const totalSize =
      totalSizeParam !== null && /^\d+$/.test(totalSizeParam)
        ? Number(totalSizeParam)
        : null;

    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > LECTURE_MAX_BYTES
    ) {
      throw new LectureVideosHttpError(400, "Invalid upload chunk offset.");
    }

    const contentType =
      request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ||
      undefined;
    if (
      (totalSize !== null && totalSize > LECTURE_MAX_BYTES) ||
      Number(request.headers.get("content-length") || 0) > LECTURE_MAX_BYTES
    ) {
      throw new LectureVideosHttpError(
        400,
        "Video file exceeds the 300 MB maximum size."
      );
    }

    const initialCheck = validateLectureUpload(
      pathname,
      contentType,
      totalSize ?? undefined
    );
    if (!initialCheck.ok) {
      throw new LectureVideosHttpError(
        400,
        initialCheck.reason ?? "Invalid video file."
      );
    }

    const fullPath = resolveLocalLectureFilePath(pathname);
    if (!fullPath) {
      throw new LectureVideosHttpError(400, "Invalid upload destination.");
    }

    const arrayBuffer = await request.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    if (byteLength <= 0 || offset + byteLength > LECTURE_MAX_BYTES) {
      throw new LectureVideosHttpError(400, "Invalid video chunk size.");
    }

    if (offset === 0) {
      const headerBytes = new Uint8Array(
        arrayBuffer.slice(0, Math.min(32, byteLength))
      );
      const sigCheck = validateLectureSignature(pathname, headerBytes);
      if (!sigCheck.ok) {
        throw new LectureVideosHttpError(
          400,
          sigCheck.reason ?? "Video file signature verification failed."
        );
      }
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, Buffer.from(arrayBuffer));
    } else {
      let currentSize = -1;
      try {
        const stat = await fs.promises.stat(fullPath);
        currentSize = stat.size;
      } catch {
        throw new LectureVideosHttpError(
          400,
          "Upload session expired. Please upload the video again."
        );
      }
      if (currentSize !== offset) {
        throw new LectureVideosHttpError(
          400,
          `Chunk offset mismatch (expected ${currentSize}, received ${offset}).`
        );
      }
      await fs.promises.appendFile(fullPath, Buffer.from(arrayBuffer));
    }

    const newSize = offset + byteLength;
    const isComplete = totalSize === null || newSize >= totalSize;
    if (isComplete && totalSize !== null && newSize !== totalSize) {
      await fs.promises.unlink(fullPath).catch(() => {});
      throw new LectureVideosHttpError(
        400,
        "Uploaded video file size did not match expected size."
      );
    }

    return NextResponse.json({
      url: `${LOCAL_LECTURE_URL_PREFIX}${pathname}`,
      pathname,
      receivedBytes: newSize,
      complete: isComplete,
    });
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

