import fs from "node:fs";
import { NextResponse } from "next/server";
import { requireLectureVideosApiActor } from "@/lib/lecture-videos/guard";
import { parseHttpByteRange } from "@/lib/lecture-videos/lectures";
import {
  LOCAL_LECTURE_URL_PREFIX,
  LectureVideosHttpError,
  getLectureForStreaming,
  resolveLocalLectureFilePath,
} from "@/lib/lecture-videos/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function createSafeFileWebStream(
  filePath: string,
  options?: { start?: number; end?: number },
  abortSignal?: AbortSignal
): ReadableStream<Uint8Array> {
  let nodeStream: fs.ReadStream | null = null;
  let closed = false;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream = fs.createReadStream(filePath, options);
      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (nodeStream && !nodeStream.destroyed) {
          nodeStream.destroy();
        }
      };

      if (abortSignal) {
        if (abortSignal.aborted) {
          cleanup();
          try {
            controller.close();
          } catch {
            // already closed
          }
          return;
        }
        abortSignal.addEventListener("abort", cleanup, { once: true });
      }

      nodeStream.on("data", (chunk: Buffer | string) => {
        if (closed) return;
        try {
          const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
          controller.enqueue(
            new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
          );
        } catch {
          cleanup();
        }
      });

      nodeStream.on("end", () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      });

      nodeStream.on("error", (err) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(err);
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      closed = true;
      if (nodeStream && !nodeStream.destroyed) {
        nodeStream.destroy();
      }
    },
  });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/lecture-videos/[id]/stream
 * Authenticated video stream endpoint for ITE students and ITE faculty/admins.
 * - Never exposes the underlying storage URL.
 * - Parses and validates HTTP Range headers against lecture.fileSize:
 *   - Returns 416 Range Not Satisfiable (with Content-Range: bytes * / size) for invalid or past-EOF ranges.
 *   - Caps open-ended ranges to 8 MB chunks so each serverless invocation completes rapidly within maxDuration.
 *   - Pipes the Web ReadableStream (upstream.body) directly without buffering the video into memory.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireLectureVideosApiActor(request);
    const { id } = await context.params;
    const lecture = await getLectureForStreaming(actor, id);

    const parsedRange = parseHttpByteRange(
      request.headers.get("range"),
      lecture.fileSize
    );

    if (parsedRange.kind === "unsatisfiable") {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range": parsedRange.contentRange,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (lecture.storageUrl.startsWith(LOCAL_LECTURE_URL_PREFIX)) {
      const localPathname = lecture.storageUrl.slice(
        LOCAL_LECTURE_URL_PREFIX.length
      );
      const localFilePath = resolveLocalLectureFilePath(localPathname);
      if (!localFilePath || !fs.existsSync(localFilePath)) {
        return NextResponse.json(
          { message: "Recorded lecture video file not found." },
          { status: 404 }
        );
      }

      const actualSize = fs.statSync(localFilePath).size;
      const localRange = parseHttpByteRange(
        request.headers.get("range"),
        actualSize
      );

      if (localRange.kind === "unsatisfiable") {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": localRange.contentRange,
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      const headers = new Headers();
      headers.set("Content-Type", lecture.mimeType || "video/mp4");
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "private, no-store");
      headers.set("X-Content-Type-Options", "nosniff");

      if (localRange.kind === "partial") {
        headers.set("Content-Range", localRange.contentRange);
        headers.set("Content-Length", String(localRange.contentLength));
        return new NextResponse(
          createSafeFileWebStream(
            localFilePath,
            {
              start: localRange.start,
              end: localRange.end,
            },
            request.signal
          ),
          {
            status: 206,
            headers,
          }
        );
      }

      headers.set("Content-Length", String(actualSize));
      return new NextResponse(
        createSafeFileWebStream(localFilePath, undefined, request.signal),
        {
          status: 200,
          headers,
        }
      );
    }

    const upstreamHeaders = new Headers();
    upstreamHeaders.set("Accept-Encoding", "identity");
    if (parsedRange.kind === "partial") {
      upstreamHeaders.set("Range", parsedRange.upstreamRangeHeader);
    }

    const upstream = await fetch(lecture.storageUrl, {
      headers: upstreamHeaders,
      cache: "no-store",
      signal: request.signal,
    });

    if (upstream.status === 416) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          "Content-Range":
            upstream.headers.get("content-range") ||
            `bytes */${lecture.fileSize}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { message: "Video stream is temporarily unavailable." },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      lecture.mimeType || upstream.headers.get("content-type") || "video/mp4"
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "private, no-store");
    responseHeaders.set("X-Content-Type-Options", "nosniff");

    const contentRange =
      upstream.headers.get("content-range") ||
      (parsedRange.kind === "partial" ? parsedRange.contentRange : null);
    if (contentRange) {
      responseHeaders.set("Content-Range", contentRange);
    }

    const contentLength =
      upstream.headers.get("content-length") ||
      (parsedRange.kind === "partial"
        ? String(parsedRange.contentLength)
        : lecture.fileSize > 0
          ? String(lecture.fileSize)
          : null);
    if (contentLength) {
      responseHeaders.set("Content-Length", contentLength);
    }

    const status =
      parsedRange.kind === "partial" ? 206 : upstream.status;

    return new NextResponse(upstream.body, {
      status,
      headers: responseHeaders,
    });
  } catch (err) {
    if (err instanceof LectureVideosHttpError) {
      return NextResponse.json(
        { message: err.message },
        { status: err.status }
      );
    }
    if (
      err &&
      typeof err === "object" &&
      "status" in err &&
      typeof (err as { status: unknown }).status === "number"
    ) {
      const status = (err as { status: number }).status;
      const message =
        "message" in err &&
        typeof (err as { message: unknown }).message === "string"
          ? (err as { message: string }).message
          : "Access denied.";
      return NextResponse.json({ message }, { status });
    }
    return NextResponse.json(
      { message: "Unable to stream lecture video." },
      { status: 500 }
    );
  }
}

