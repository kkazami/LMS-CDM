/**
 * apps/web/src/app/api/ite/focus/summary/route.ts
 *
 * GET /api/ite/focus/summary
 * Retrieves the current ITE student's private focus statistics.
 */

import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/practicum/http";
import { requireFocusStudentActor } from "@/lib/ite/focus/guard";
import { computeFocusSummary } from "@/lib/ite/focus/service";

export async function GET(request: Request) {
  try {
    const actor = await requireFocusStudentActor(request);
    const summary = await computeFocusSummary(actor.userId);

    return NextResponse.json(summary);
  } catch (err) {
    return errorResponse(err);
  }
}
