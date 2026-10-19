import { NextResponse } from "next/server";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { summarizeThread } from "@/features/knowledge-exchange/ai/summarize";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const eligibility = await checkKxEligibility(request);
  if (!eligibility) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "Forbidden: Knowledge Exchange is exclusive to ICS." },
      { status: 403 }
    );
  }

  const json = await request.json().catch(() => ({}));
  const { title = "", body = "", answers = [] } = json;

  const result = await summarizeThread(title, body, answers);

  if (!result.success && result.isUnavailable) {
    return NextResponse.json(
      { error: result.error || "AI features temporarily unavailable" },
      { status: 503 }
    );
  }

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Failed to generate thread summary." },
      { status: 400 }
    );
  }

  return NextResponse.json(result);
}
