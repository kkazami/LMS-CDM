/**
 * apps/web/src/app/api/ite/meetings/[id]/join/route.ts
 *
 * POST /api/ite/meetings/[id]/join - Join a live meeting
 */

import { NextResponse } from "next/server";
import { after } from "next/server";
import { errorResponse } from "@/lib/practicum/http";
import { requireMeetingActor } from "@/lib/ite/meetings/guard";
import { joinMeeting } from "@/lib/ite/meetings/service";
import { logActivity } from "@/lib/ite/activity-logger";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireMeetingActor(request);
    const { id } = await context.params;

    const result = await joinMeeting(actor, id);

    // If student, log MEETING_JOIN activity event in after() block
    if (actor.role === "STUDENT") {
      after(async () => {
        try {
          await logActivity({
            userId: actor.userId,
            instituteId: actor.instituteId,
            courseId: result.courseId,
            type: "MEETING_JOIN",
            refId: result.meetingId,
          });
        } catch (err) {
          console.error("[MEETING_JOIN_ACTIVITY_LOG_ERROR]", err);
        }
      });
    }

    return NextResponse.json({ joinUrl: result.joinUrl });
  } catch (err) {
    return errorResponse(err);
  }
}
