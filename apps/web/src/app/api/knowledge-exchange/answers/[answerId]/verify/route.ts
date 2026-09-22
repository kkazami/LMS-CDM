import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { awardExpForVerifiedAnswer } from "@/lib/gamification/kx-exp";

export const dynamic = "force-dynamic";

export async function POST(
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

  // Verify button visible only to PROFESSOR and ADMIN roles
  if (eligibility.role !== "ADMIN" && eligibility.role !== "INSTRUCTOR") {
    return NextResponse.json(
      { error: "Only instructors and administrators can verify answers." },
      { status: 403 }
    );
  }

  const { answerId } = await params;
  const answer = await db.kxAnswer.findUnique({
    where: { id: answerId },
    include: {
      post: { select: { id: true, title: true } },
    },
  });

  if (!answer || answer.isDeleted) {
    return NextResponse.json({ error: "Answer not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const isVerified = body.isVerified !== undefined ? Boolean(body.isVerified) : !answer.isVerified;

  await db.kxAnswer.update({
    where: { id: answerId },
    data: {
      isVerified,
      verifiedById: isVerified ? eligibility.session.user.id : null,
    },
  });

  if (isVerified) {
    await awardExpForVerifiedAnswer(answer.authorId, answerId).catch(() => {});

    // Notify author
    if (answer.authorId !== eligibility.session.user.id) {
      await db.kxNotification.create({
        data: {
          userId: answer.authorId,
          type: "VERIFIED",
          title: "Instructor Verified Your Answer!",
          message: `An instructor officially verified your answer to "${answer.post.title}"! (+25 EXP)`,
          link: `/ics/knowledge-exchange/post/${answer.postId}#answer-${answerId}`,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({
    success: true,
    answer: {
      id: answerId,
      isVerified,
      verifiedById: isVerified ? eligibility.session.user.id : null,
    },
  });
}
