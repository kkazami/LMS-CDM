import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "../workspace/_shared";

export const dynamic = "force-dynamic";

// POST: Log a new study session (Pomodoro focus time)
export async function POST(request: Request) {
  try {
    const { session, response } = await requireWorkspaceSession();
    if (response) return response;

    const body = await request.json();
    const { courseId, syllabusItemId, durationSeconds, startedAt, completedAt } = body;

    if (!courseId || !durationSeconds || !startedAt || !completedAt) {
      return NextResponse.json(
        { message: "Missing required fields for study session log." },
        { status: 400 }
      );
    }

    const log = await db.studySessionLog.create({
      data: {
        userId: session.user.id,
        courseId,
        syllabusItemId,
        durationSeconds,
        startedAt: new Date(startedAt),
        completedAt: new Date(completedAt),
      },
    });

    return NextResponse.json(log);
  } catch (error) {
    console.error("Error logging study session:", error);
    return NextResponse.json(
      { message: "Failed to log study session." },
      { status: 500 }
    );
  }
}

// GET: Fetch study sessions for the user (can optionally filter by course)
export async function GET(request: Request) {
  try {
    const { session, response } = await requireWorkspaceSession();
    if (response) return response;

    const url = new URL(request.url);
    const courseId = url.searchParams.get("courseId");

    const where: any = { userId: session.user.id };
    if (courseId) {
      where.courseId = courseId;
    }

    const logs = await db.studySessionLog.findMany({
      where,
      orderBy: { completedAt: "desc" },
    });

    // Optionally calculate totals
    const totalDuration = logs.reduce((acc, log) => acc + log.durationSeconds, 0);

    return NextResponse.json({ logs, totalDurationSeconds: totalDuration });
  } catch (error) {
    console.error("Error fetching study sessions:", error);
    return NextResponse.json(
      { message: "Failed to fetch study sessions." },
      { status: 500 }
    );
  }
}
