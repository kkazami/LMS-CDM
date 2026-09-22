import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { CreateAnswerSchema } from "@/features/knowledge-exchange/schemas";
import { serializeAuthor } from "@/features/knowledge-exchange/utils";
import { awardExpForAnswer } from "@/lib/gamification/kx-exp";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
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

  const { postId } = await params;
  const post = await db.kxPost.findUnique({
    where: { id: postId },
    select: { id: true, isDeleted: true, status: true, authorId: true, title: true },
  });

  if (!post || post.isDeleted) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  if (post.status === "LOCKED") {
    return NextResponse.json(
      { error: "This post is locked. No new answers are allowed." },
      { status: 400 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = CreateAnswerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const { body, isAnonymous } = parsed.data;
  const userId = eligibility.session.user.id;

  const answer = await db.$transaction(async (tx) => {
    const createdAnswer = await tx.kxAnswer.create({
      data: {
        postId,
        authorId: userId,
        body,
        isAnonymous,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            role: true,
            email: true,
            studentNumber: true,
            avatarUrl: true,
          },
        },
      },
    });

    await tx.kxPost.update({
      where: { id: postId },
      data: { answerCount: { increment: 1 } },
    });

    // Notify question author if not self
    if (post.authorId !== userId) {
      await tx.kxNotification.create({
        data: {
          userId: post.authorId,
          type: "ANSWER",
          title: "New Answer Received",
          message: `${isAnonymous ? "Someone" : eligibility.session.user.name} posted an answer to: "${post.title}"`,
          link: `/ics/knowledge-exchange/post/${postId}#answer-${createdAnswer.id}`,
        },
      });
    }

    return createdAnswer;
  });

  // Award EXP (+10 for answering)
  await awardExpForAnswer(userId, answer.id).catch(() => {});

  const viewer = {
    id: userId,
    role: eligibility.role,
  };

  const serialized = {
    id: answer.id,
    postId: answer.postId,
    authorId: answer.isAnonymous && viewer.role !== "ADMIN" ? null : answer.authorId,
    body: answer.body,
    isAnonymous: answer.isAnonymous,
    isAccepted: answer.isAccepted,
    isVerified: answer.isVerified,
    verifiedById: answer.verifiedById,
    voteCount: answer.voteCount,
    userVote: 0,
    isDeleted: answer.isDeleted,
    createdAt: answer.createdAt.toISOString(),
    updatedAt: answer.updatedAt.toISOString(),
    author: serializeAuthor(answer.author, answer.isAnonymous, viewer),
    comments: [],
  };

  return NextResponse.json({ success: true, answer: serialized }, { status: 201 });
}
