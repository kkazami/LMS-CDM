import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ answerId: string }> }
) {
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

  const { answerId } = await params;
  const answer = await db.kxAnswer.findUnique({
    where: { id: answerId },
    select: { id: true, postId: true, authorId: true, isDeleted: true },
  });

  if (!answer || answer.isDeleted) {
    return NextResponse.json({ error: "Answer not found." }, { status: 404 });
  }

  const isAuthor = answer.authorId === eligibility.session.user.id;
  const isStaff =
    eligibility.role === "ADMIN" || eligibility.role === "INSTRUCTOR";

  if (!isAuthor && !isStaff) {
    return NextResponse.json(
      { error: "You do not have permission to delete this answer." },
      { status: 403 }
    );
  }

  await db.$transaction(async (tx) => {
    await tx.kxAnswer.update({
      where: { id: answerId },
      data: { isDeleted: true },
    });

    await tx.kxPost.update({
      where: { id: answer.postId },
      data: { answerCount: { decrement: 1 } },
    });
  });

  return NextResponse.json({ success: true, message: "Answer deleted." });
}
