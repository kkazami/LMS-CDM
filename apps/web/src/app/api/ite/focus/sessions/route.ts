/**
 * apps/web/src/app/api/ite/focus/sessions/route.ts
 *
 * POST /api/ite/focus/sessions
 * Starts a new focus session for an authenticated ITE student.
 */

import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/practicum/http";
import { requireFocusStudentActor } from "@/lib/ite/focus/guard";
import { validateCreateSessionInput, createFocusSession } from "@/lib/ite/focus/service";

export async function POST(request: Request) {
  try {
    const actor = await requireFocusStudentActor(request);
    const body = await readJson(request);
    const input = validateCreateSessionInput(body);
    const session = await createFocusSession(actor, input);

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
