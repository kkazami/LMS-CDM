/**
 * apps/web/src/app/api/ite/meetings/route.ts
 *
 * GET /api/ite/meetings - List visible meetings (paged, filtered)
 * POST /api/ite/meetings - Create meeting (instructor only)
 */

import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/practicum/http";
import { requireMeetingActor } from "@/lib/ite/meetings/guard";
import { createMeeting, listMeetings } from "@/lib/ite/meetings/service";

export async function GET(request: Request) {
  try {
    const actor = await requireMeetingActor(request);
    const { searchParams } = new URL(request.url);

    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");
    const cursor = searchParams.get("cursor");
    const takeParam = searchParams.get("take");
    const take = takeParam ? parseInt(takeParam, 10) : 20;

    const data = await listMeetings(actor, {
      courseId,
      status,
      cursor,
      take,
    });

    return NextResponse.json(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireMeetingActor(request);
    const body = (await readJson(request)) as {
      courseId: string;
      title: string;
      description?: string;
      joinUrl: string;
      scheduledAt?: string;
      startNow?: boolean;
    };

    const meeting = await createMeeting(actor, body);
    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
