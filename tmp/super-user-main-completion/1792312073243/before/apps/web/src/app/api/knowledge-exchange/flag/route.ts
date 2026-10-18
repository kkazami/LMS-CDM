import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { FlagSchema } from "@/features/knowledge-exchange/schemas";

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

  const json = await request.json().catch(() => null);
  const parsed = FlagSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid flag input." },
      { status: 400 }
    );
  }

  const { postId, answerId, commentId, reason, description } = parsed.data;

  if (!postId && !answerId && !commentId) {
    return NextResponse.json(
      { error: "Must specify a post, answer, or comment to report." },
      { status: 400 }
    );
  }

  const flag = await db.kxFlag.create({
    data: {
      reporterId: eligibility.session.user.id,
      postId: postId || null,
      answerId: answerId || null,
      commentId: commentId || null,
      reason,
      description,
      status: "PENDING",
    },
  });

  return NextResponse.json({ success: true, flag }, { status: 201 });
}
