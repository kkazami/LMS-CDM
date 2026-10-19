import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { VoteSchema } from "@/features/knowledge-exchange/schemas";
import { awardExpForUpvote } from "@/lib/gamification/kx-exp";

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
  const parsed = VoteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid vote input." },
      { status: 400 }
    );
  }

  const { postId, answerId, value } = parsed.data;

  if (!postId && !answerId) {
    return NextResponse.json(
      { error: "Either postId or answerId must be provided." },
      { status: 400 }
    );
  }

  const userId = eligibility.session.user.id;

  // 1. Fetch target content and author
  let targetAuthorId = "";
  let currentVoteCount = 0;

  if (postId) {
    const post = await db.kxPost.findUnique({
      where: { id: postId },
      select: { authorId: true, voteCount: true, isDeleted: true },
    });
    if (!post || post.isDeleted) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    targetAuthorId = post.authorId;
    currentVoteCount = post.voteCount;
  } else if (answerId) {
    const answer = await db.kxAnswer.findUnique({
      where: { id: answerId },
      select: { authorId: true, voteCount: true, isDeleted: true },
    });
    if (!answer || answer.isDeleted) {
      return NextResponse.json({ error: "Answer not found." }, { status: 404 });
    }
    targetAuthorId = answer.authorId;
    currentVoteCount = answer.voteCount;
  }

  // Anti-farming check: Self-voting is blocked by server validation
  if (targetAuthorId === userId) {
    return NextResponse.json(
      { error: "You cannot vote on your own content." },
      { status: 400 }
    );
  }

  // 2. Perform atomic voting toggle in transaction
  const result = await db.$transaction(async (tx) => {
    // Check if vote already exists
    const existingVote = await tx.kxVote.findFirst({
      where: {
        userId,
        postId: postId || null,
        answerId: answerId || null,
      },
    });

    let newVoteValue = value;
    let scoreDiff = 0;

    if (existingVote) {
      if (value === 0 || value === existingVote.value) {
        // Toggle OFF
        await tx.kxVote.delete({ where: { id: existingVote.id } });
        scoreDiff = -existingVote.value;
        newVoteValue = 0;
      } else {
        // Switch direction (e.g. +1 to -1 => diff -2)
        await tx.kxVote.update({
          where: { id: existingVote.id },
          data: { value },
        });
        scoreDiff = value - existingVote.value;
      }
    } else {
      if (value !== 0) {
        // Create new vote
        await tx.kxVote.create({
          data: {
            userId,
            postId: postId || null,
            answerId: answerId || null,
            value,
          },
        });
        scoreDiff = value;
      }
    }

    // Update target voteCount
    let finalVoteCount = currentVoteCount + scoreDiff;

    if (postId) {
      const updatedPost = await tx.kxPost.update({
        where: { id: postId },
        data: { voteCount: { increment: scoreDiff } },
        select: { voteCount: true },
      });
      finalVoteCount = updatedPost.voteCount;
    } else if (answerId) {
      const updatedAnswer = await tx.kxAnswer.update({
        where: { id: answerId },
        data: { voteCount: { increment: scoreDiff } },
        select: { voteCount: true },
      });
      finalVoteCount = updatedAnswer.voteCount;
    }

    return {
      voteCount: finalVoteCount,
      userVote: newVoteValue,
      isNewUpvote: newVoteValue === 1 && (!existingVote || existingVote.value !== 1),
    };
  });

  // 3. Award EXP (+2 for upvote) with daily cap and idempotencyKey
  if (result.isNewUpvote) {
    await awardExpForUpvote(
      targetAuthorId,
      userId,
      postId || answerId || ""
    ).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    voteCount: result.voteCount,
    userVote: result.userVote,
  });
}
