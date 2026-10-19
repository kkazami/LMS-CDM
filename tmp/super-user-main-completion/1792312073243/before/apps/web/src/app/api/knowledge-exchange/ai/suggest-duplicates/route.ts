import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { suggestDuplicates } from "@/features/knowledge-exchange/ai/suggest-duplicates";

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
  const { title = "" } = json;

  const institute = await db.institute.findUnique({
    where: { code: "ics" },
    select: { id: true },
  });

  if (!institute) {
    return NextResponse.json({ duplicates: [] });
  }

  const result = await suggestDuplicates(title, institute.id);

  if (!result.success && result.isUnavailable) {
    return NextResponse.json(
      { error: result.error || "AI features temporarily unavailable", duplicates: [] },
      { status: 503 }
    );
  }

  return NextResponse.json(result);
}
