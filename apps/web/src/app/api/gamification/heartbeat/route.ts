import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { grantExp } from "@/lib/gamification/grant-exp";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";
import { processLoginReward } from "@/lib/gamification/login-rewards";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

// Active time milestones in seconds & reward EXP
const TIMER_MILESTONES = [
  { seconds: 900, exp: 15, label: "15 Minutes Active Focus" },   // 15 min
  { seconds: 1800, exp: 30, label: "30 Minutes Study Block" },   // 30 min
  { seconds: 3600, exp: 60, label: "1 Hour Deep Work" },         // 60 min
  { seconds: 7200, exp: 120, label: "2 Hours Scholar Milestone" }, // 120 min
];

export async function GET(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    let rewardResult: { rewarded: boolean; streak: number } | null = null;
    if (session.user.role === "STUDENT") {
      try {
        rewardResult = await processLoginReward(session.user.id);
      } catch (err) {
        console.error("HEARTBEAT_LOGIN_REWARD_ERROR", err);
      }
    }

    const profile = await db.gamificationProfile.findUnique({
      where: { studentId: session.user.id },
    });

    return NextResponse.json(
      {
        profile: profile || {
          exp: 0,
          level: 1,
          loginStreakCurrent: 1,
          loginStreakLongest: 1,
          currentStreak: 1,
          longestStreak: 1,
        },
        rewardReceipt: rewardResult
          ? {
              rewarded: rewardResult.rewarded,
              streak: rewardResult.streak,
              expEarned: rewardResult.rewarded ? 10 : 0,
            }
          : null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("GET_HEARTBEAT_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: Request) {
  const corsHeaders = getCorsHeaders(req);
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const { courseId, isActive } = (await req.json()) as {
      courseId?: string;
      isActive: boolean;
    };

    // If student was idle, acknowledge without incrementing study time
    if (!isActive) {
      return NextResponse.json({ ok: true, activeDuration: 0, expAwarded: 0 }, { headers: corsHeaders });
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

    return NextResponse.json(
      {
        ok: true,
        totalSecondsToday: currentDuration,
        expAwarded,
        milestoneLabel: expAwarded > 0 ? milestoneLabel : null,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("HEARTBEAT_ERROR", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500, headers: corsHeaders });
  }
}
