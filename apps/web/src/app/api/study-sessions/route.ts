import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "../workspace/_shared";

export const dynamic = "force-dynamic";

import { grantExp } from "@/lib/gamification/grant-exp";
import { EXP_VALUES, DAILY_EXP_CAPS } from "@/lib/gamification/exp-engine";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";

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

    // Grant EXP for verified study sessions (≥15 mins / 900s, max 50 EXP/day)
    if (durationSeconds >= 900) {
      try {
        await grantExp({
          userId: session.user.id,
          amount: EXP_VALUES.study_focus_15m,
          reason: "Completed 15 min Focus Study Session",
          source: "study_session",
          courseId,
          dailyCap: DAILY_EXP_CAPS.study_session,
        });
        await awardBadgeIfEarned(session.user.id, "study-session-first");
      } catch (gamiErr) {
        console.error("GAMIFICATION_STUDY_SESSION_ERROR", gamiErr);
      }
    }

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
