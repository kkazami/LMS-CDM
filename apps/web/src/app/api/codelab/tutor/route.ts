/**
 * POST /api/codelab/tutor
 *
 * Secure Harnessed Socratic AI Tutor for CodeLab.
 *
 * Security & Pedagogical Invariants:
 *  1. Authenticated session required + ICS eligibility enforced.
 *  2. Runs within the Lumina LMS AI Harness (3 Concentric Layers).
 *  3. Layer 2 Socratic Guardrail prevents direct solution code dumps.
 *  4. Layer 2 Rate Limiter prevents API budget exhaustion.
 *  5. Autonomous Retry Loop triggers if a draft response is rejected by safety sensors.
 *  6. Emits structured trace logs for auditing.
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { checkActivityEligibility } from "@/lib/activity-eligibility";
import { runHarnessedAgent } from "@/lib/harness/core/agent-runner";
import { InstituteCode, UserRole } from "@/lib/harness/core/types";

export const dynamic = "force-dynamic";

interface TutorRequestBody {
  prompt: string;
  templateId?: string;
  sourceCode?: string;
  errorOutput?: string;
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate Session
    const session = await getSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Enforce ICS Eligibility
    const eligibility = await checkActivityEligibility();
    if (!eligibility || !eligibility.eligible) {
      return NextResponse.json(
        { error: "Forbidden: CodeLab AI Assistant is exclusive to the Institute of Computer Studies (ICS)." },
        { status: 403 }
      );
    }

    // 3. Parse Request Payload
    const body = (await request.json()) as TutorRequestBody;
    const { prompt, templateId, sourceCode, errorOutput } = body;

    if (!prompt || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    // Formulate contextualized prompt for the agent
    let fullPrompt = prompt;
    if (errorOutput) {
      fullPrompt += `\n\n[Console Error Output]\n${errorOutput}`;
    }
    if (sourceCode) {
      fullPrompt += `\n\n[Student Source Code Snippet]\n${sourceCode.slice(0, 2000)}`;
    }

    // 4. Execute through the Lumina LMS AI Harness
    const harnessResult = await runHarnessedAgent({
      prompt: fullPrompt,
      context: {
        userId: session.user.id,
        instituteId: session.user.instituteId,
        instituteCode: "ics" as InstituteCode,
        role: session.user.role as UserRole,
      },
      maxRetries: 3,
      systemDirective:
        "You are the Socratic AI CodeLab Tutor at CdM LMS. Guide the student by highlighting conceptual mistakes, off-by-one errors, or syntax issues. NEVER provide complete copy-paste code solutions. Always conclude with a reflective question.",
    });

    return NextResponse.json({
      success: harnessResult.success,
      response: harnessResult.response,
      meta: {
        attempts: harnessResult.attemptsNeeded,
        traceId: harnessResult.traceId,
        guardrailFlags: harnessResult.violations,
      },
    });
  } catch (error: any) {
    console.error("[CODELAB_TUTOR_API_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error in AI Tutor Harness", details: error?.message },
      { status: 500 }
    );
  }
}
