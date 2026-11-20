import { NextResponse } from "next/server";
import { requireLectureVideosApiActor } from "@/lib/lecture-videos/guard";
import { parseHttpByteRange } from "@/lib/lecture-videos/lectures";
import {
  LectureVideosHttpError,
  getLectureForStreaming,
} from "@/lib/lecture-videos/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

