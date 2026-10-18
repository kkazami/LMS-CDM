import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const VALID_EVENT_TYPES = ["TAB_SWITCH", "COPY_PASTE", "FULLSCREEN_EXIT", "RIGHT_CLICK"] as const;
type ValidEventType = (typeof VALID_EVENT_TYPES)[number];

const DEFAULT_SEVERITIES: Record<ValidEventType, "LOW" | "MEDIUM" | "HIGH"> = {
  TAB_SWITCH: "MEDIUM",
  COPY_PASTE: "HIGH",
  FULLSCREEN_EXIT: "HIGH",
  RIGHT_CLICK: "LOW",
};

/**
 * POST /api/integrity/events
 * Real-time event logging endpoint for student quiz / activity attempts.
 * Supports standard JSON and navigator.sendBeacon requests.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        return NextResponse.json({ message: "Invalid payload format" }, { status: 400 });
      }
    }

    const { syllabusItemId, eventType, severity, metadata, submissionId } = body;

    if (!syllabusItemId || typeof syllabusItemId !== "string") {
      return NextResponse.json({ message: "Missing required syllabusItemId" }, { status: 400 });
    }

    if (!eventType || typeof eventType !== "string" || !VALID_EVENT_TYPES.includes(eventType as ValidEventType)) {
      return NextResponse.json(
        { message: `Invalid eventType. Must be one of: ${VALID_EVENT_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify syllabus item and course access
    const item = await db.syllabusItem.findUnique({
      where: { id: syllabusItemId },
      select: { id: true, courseId: true, type: true, enableIntegrityMonitoring: true },
    });

    if (!item) {
      return NextResponse.json({ message: "Syllabus item not found" }, { status: 404 });
    }

    const role = session.user.role.toUpperCase();
    const isStudent = role === "STUDENT";

    if (isStudent) {
      const enrollment = await db.enrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId: item.courseId,
            studentId: session.user.id,
          },
        },
        select: { status: true },
      });

      if (!enrollment || enrollment.status !== "APPROVED") {
        return NextResponse.json({ message: "Forbidden: Not enrolled in course" }, { status: 403 });
      }
    }

    // Resolve submission record if not directly supplied
    let resolvedSubmissionId: string | null = typeof submissionId === "string" ? submissionId : null;
    if (!resolvedSubmissionId) {
      const existingSubmission = await db.studentSubmission.findUnique({
        where: {
          syllabusItemId_studentId: {
            syllabusItemId,
            studentId: session.user.id,
          },
        },
        select: { id: true },
      });
      resolvedSubmissionId = existingSubmission?.id ?? null;
    }

    const typedEventType = eventType as ValidEventType;
    const finalSeverity =
      typeof severity === "string" && ["LOW", "MEDIUM", "HIGH"].includes(severity)
        ? severity
        : DEFAULT_SEVERITIES[typedEventType];

    const finalMetadata =
      typeof metadata === "string"
        ? metadata
        : JSON.stringify(typeof metadata === "object" && metadata !== null ? metadata : {});

    const event = await db.integrityEvent.create({
      data: {
        studentId: session.user.id,
        syllabusItemId,
        submissionId: resolvedSubmissionId,
        eventType: typedEventType,
        severity: finalSeverity,
        metadata: finalMetadata,
      },
    });

    return NextResponse.json(
      {
        success: true,
        eventId: event.id,
        eventType: event.eventType,
        severity: event.severity,
        timestamp: event.timestamp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("LOG_INTEGRITY_EVENT_ERROR", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/integrity/events?syllabusItemId=...&studentId=...
 * Fetch logged integrity events for instructor review.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const syllabusItemId = searchParams.get("syllabusItemId");
    const studentId = searchParams.get("studentId");

    if (!syllabusItemId) {
      return NextResponse.json({ message: "Missing required syllabusItemId" }, { status: 400 });
    }

    const item = await db.syllabusItem.findUnique({
      where: { id: syllabusItemId },
      select: { id: true, courseId: true },
    });

    if (!item) {
      return NextResponse.json({ message: "Syllabus item not found" }, { status: 404 });
    }

    const role = session.user.role.toUpperCase();
    const isInstructor = role === "PROFESSOR" || role === "ADMIN";

    // Students may only view their own events; instructors may view all or specific student
    const targetStudentId = isInstructor ? studentId ?? undefined : session.user.id;

    const events = await db.integrityEvent.findMany({
      where: {
        syllabusItemId,
        ...(targetStudentId ? { studentId: targetStudentId } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentNumber: true,
          },
        },
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("GET_INTEGRITY_EVENTS_ERROR", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
