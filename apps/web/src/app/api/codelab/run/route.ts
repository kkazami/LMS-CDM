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

export const dynamic = "force-dynamic";

const JUDGE0_BASE_URL = process.env.JUDGE0_URL || "http://localhost:2358";
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || "";
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

    // 4. Forward to Judge0
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (JUDGE0_AUTH_TOKEN) {
      headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN;
    }

    const res = await fetch(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          source_code: sourceCode,
          language_id: languageId,
          stdin: stdin || "",
          cpu_time_limit: 5.0,
          memory_limit: 128000,
        }),
      }
    );

    if (!res.ok) {
      console.error("Judge0 run error:", await res.text());
      return NextResponse.json({ error: "Failed to execute code" }, { status: 502 });
    }

    const result = await res.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("CODELAB_RUN_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
