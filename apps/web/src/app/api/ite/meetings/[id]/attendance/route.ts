/**
 * apps/web/src/app/api/ite/meetings/[id]/attendance/route.ts
 *
 * GET /api/ite/meetings/[id]/attendance - View meeting attendees (instructor only)
 */

import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/practicum/http";
import { requireMeetingActor } from "@/lib/ite/meetings/guard";
import { getMeetingAttendance } from "@/lib/ite/meetings/service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireMeetingActor(request);
    const { id } = await context.params;

    const attendance = await getMeetingAttendance(actor, id);
    return NextResponse.json(attendance);
  } catch (err) {
    return errorResponse(err);
  }
}
