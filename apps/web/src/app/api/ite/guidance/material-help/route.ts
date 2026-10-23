/**
 * apps/web/src/app/api/ite/guidance/material-help/route.ts
 *
 * POST /api/ite/guidance/material-help
 *
 * Requests AI-assisted study help for a specific learning material.
 * Strict ITE student authentication; enforces daily rate limit (10/day Manila)
 * and 5-second cooldown.
 */

import { NextResponse } from "next/server";
import { errorResponse, readJson } from "@/lib/practicum/http";
import { requireGuidanceStudentActor } from "@/lib/ite/guidance/guard";
import { MaterialHelpRequestSchema } from "@/lib/ite/guidance/schemas";
import { processMaterialHelp } from "@/lib/ite/guidance/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // 1. Enforce ITE student role
    const actor = await requireGuidanceStudentActor(request);

    // 2. Parse and validate payload
    const body = await readJson(request);
    const parsed = MaterialHelpRequestSchema.parse(body);

    // 3. Process study help
    const result = await processMaterialHelp({
      userId: actor.userId,
      materialId: parsed.materialId,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
