/**
 * apps/web/src/app/api/ite/meetings/[id]/route.ts
 *
 * PATCH /api/ite/meetings/[id] - Start, end, cancel, or edit meeting
 */

import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/practicum/http";
import { requireMeetingActor } from "@/lib/ite/meetings/guard";
import { updateMeeting } from "@/lib/ite/meetings/service";
import type { UpdateMeetingInput } from "@/lib/ite/meetings/types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireMeetingActor(request);
    const { id } = await context.params;
    const body = (await readJson(request)) as UpdateMeetingInput;

    const updated = await updateMeeting(actor, id, body);
    return NextResponse.json(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
