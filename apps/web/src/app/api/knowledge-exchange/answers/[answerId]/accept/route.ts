import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { awardExpForAcceptedAnswer } from "@/lib/gamification/kx-exp";

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

  const { answerId } = await params;
  const answer = await db.kxAnswer.findUnique({
    where: { id: answerId },
    include: {
      post: {
        select: { id: true, authorId: true, title: true },
      },
    },
  });

  if (!answer || answer.isDeleted) {
    return NextResponse.json({ error: "Answer not found." }, { status: 404 });
  }

  // Accept button visible only to question author
  if (answer.post.authorId !== eligibility.session.user.id) {
    return NextResponse.json(
      { error: "Only the question author can accept an answer." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const isAccepted = body.isAccepted !== undefined ? Boolean(body.isAccepted) : !answer.isAccepted;

  await db.$transaction(async (tx) => {
    if (isAccepted) {
      // Unaccept any previous answers for this post
      await tx.kxAnswer.updateMany({
        where: { postId: answer.postId, isAccepted: true },
        data: { isAccepted: false },
      });

      // Accept this answer
      await tx.kxAnswer.update({
        where: { id: answerId },
        data: { isAccepted: true },
      });

      // Update post status to ANSWERED
      await tx.kxPost.update({
        where: { id: answer.postId },
        data: { status: "ANSWERED" },
      });

      // Notify answer author if not self
      if (answer.authorId !== eligibility.session.user.id) {
        await tx.kxNotification.create({
          data: {
            userId: answer.authorId,
            type: "ACCEPTED",
            title: "Answer Accepted!",
            message: `Your answer to "${answer.post.title}" was accepted as the solution! (+15 EXP)`,
            link: `/ics/knowledge-exchange/post/${answer.postId}#answer-${answerId}`,
          },
        });
      }
    } else {
      // Unaccept
      await tx.kxAnswer.update({
        where: { id: answerId },
        data: { isAccepted: false },
      });

      // Check if any other accepted answers exist
      const remainingAccepted = await tx.kxAnswer.count({
        where: { postId: answer.postId, isAccepted: true },
      });

      if (remainingAccepted === 0) {
        await tx.kxPost.update({
          where: { id: answer.postId },
          data: { status: "OPEN" },
        });
      }
    }
  });

  if (isAccepted) {
    await awardExpForAcceptedAnswer(answer.authorId, answerId).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    answer: { id: answerId, isAccepted },
  });
}
