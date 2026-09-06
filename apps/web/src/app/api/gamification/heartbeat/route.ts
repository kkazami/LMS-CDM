import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { grantExp } from "@/lib/gamification/grant-exp";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";

export const dynamic = "force-dynamic";

// Active time milestones in seconds & reward EXP
const TIMER_MILESTONES = [
  { seconds: 900, exp: 15, label: "15 Minutes Active Focus" },   // 15 min
  { seconds: 1800, exp: 30, label: "30 Minutes Study Block" },   // 30 min
  { seconds: 3600, exp: 60, label: "1 Hour Deep Work" },         // 60 min
  { seconds: 7200, exp: 120, label: "2 Hours Scholar Milestone" }, // 120 min
];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { courseId, isActive } = (await req.json()) as {
      courseId?: string;
      isActive: boolean;
    };

    // If student was idle, acknowledge without incrementing study time
    if (!isActive) {
      return NextResponse.json({ ok: true, activeDuration: 0, expAwarded: 0 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create today's active session log
    const recentLog = await db.studySessionLog.findFirst({
      where: {
        userId: session.user.id,
        startedAt: { gte: today },
      },
      orderBy: { startedAt: "desc" },
    });

    let currentDuration = 60; // 1 minute increment
    if (recentLog) {
      currentDuration = recentLog.durationSeconds + 60;
      await db.studySessionLog.update({
        where: { id: recentLog.id },
        data: {
          durationSeconds: currentDuration,
          completedAt: new Date(),
        },
      });
    } else {
      await db.studySessionLog.create({
        data: {
          userId: session.user.id,
          courseId: courseId ?? null,
          durationSeconds: 60,
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    // Check for milestone rewards
    let expAwarded = 0;
    let milestoneLabel = "";

    for (const milestone of TIMER_MILESTONES) {
      // Check if the student hit the milestone exact window (within 60s)
      if (currentDuration >= milestone.seconds && currentDuration - 60 < milestone.seconds) {
        expAwarded = milestone.exp;
        milestoneLabel = milestone.label;
        await grantExp({
          userId: session.user.id,
          amount: expAwarded,
          reason: `Timer Reward: ${milestoneLabel}`,
          source: "study_timer",
          courseId,
        });

        if (milestone.seconds >= 3600) {
          await awardBadgeIfEarned(session.user.id, "deep-work-1h");
        }
        break;
      }
    }

    return NextResponse.json({
      ok: true,
      totalSecondsToday: currentDuration,
      expAwarded,
      milestoneLabel: expAwarded > 0 ? milestoneLabel : null,
    });
  } catch (error) {
    console.error("HEARTBEAT_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
