/**
 * POST /api/codelab/run
 *
 * Simple "run my code" endpoint — forwards student code to Judge0 for
 * freeform execution with optional stdin. No test case evaluation.
 *
 * Security:
 *   - Requires valid session (401)
 *   - Requires ICS eligibility (403)
 *   - All execution runs in Judge0 sandbox
 *   - 64 KB source code limit
 */

import { NextResponse } from "next/server";
import { checkActivityEligibility } from "@/lib/activity-eligibility";
import { executeJudge0Submission } from "@/features/interactive-activities/codelab/utils/judge0-config";

export const dynamic = "force-dynamic";

const MAX_SOURCE_CODE_BYTES = 64 * 1024;

export async function POST(request: Request) {
  try {
    // 1. Auth + eligibility
    const eligibility = await checkActivityEligibility();
    if (!eligibility) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!eligibility.eligible) {
      return NextResponse.json({ error: "Forbidden: Not eligible for activities" }, { status: 403 });
    }

    // 2. Parse request
    const body = (await request.json()) as {
      sourceCode: string;
      languageId: number;
      stdin?: string;
    };

    const { sourceCode, languageId, stdin } = body;

    if (!sourceCode || !languageId) {
      return NextResponse.json(
        { error: "Missing required fields: sourceCode and languageId" },
        { status: 400 }
      );
    }

    // 3. Size check
    const sourceBytes = new TextEncoder().encode(sourceCode).length;
    if (sourceBytes > MAX_SOURCE_CODE_BYTES) {
      return NextResponse.json(
        { error: `Source code exceeds maximum size of ${MAX_SOURCE_CODE_BYTES / 1024} KB` },
        { status: 413 }
      );
    }

    // 4. Forward to resilient Judge0 execution engine
    const result = await executeJudge0Submission(sourceCode, languageId, stdin || "");
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("CODELAB_RUN_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
