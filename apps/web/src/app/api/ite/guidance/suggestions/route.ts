/**
 * apps/web/src/app/api/ite/guidance/suggestions/route.ts
 *
 * GET /api/ite/guidance/suggestions
 *
 * Returns up to 3 prioritized rule-based study suggestions for the authenticated ITE student.
 * Uses no model calls.
 */

import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/practicum/http";
import { requireGuidanceStudentActor } from "@/lib/ite/guidance/guard";
import { getStudentStudySuggestions } from "@/lib/ite/guidance/suggestions-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const actor = await requireGuidanceStudentActor(request);

    const suggestions = await getStudentStudySuggestions({
      studentId: actor.userId,
      instituteCode: actor.instituteCode,
    });

    return NextResponse.json({ suggestions });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
