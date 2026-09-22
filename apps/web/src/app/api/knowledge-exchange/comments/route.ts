import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { CreateCommentSchema } from "@/features/knowledge-exchange/schemas";
import { serializeAuthor } from "@/features/knowledge-exchange/utils";

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
  const parsed = CreateCommentSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const { postId, answerId, body, isAnonymous } = parsed.data;

  if (!postId && !answerId) {
    return NextResponse.json(
      { error: "Either postId or answerId must be provided." },
      { status: 400 }
    );
  }

  if (postId) {
    const parentPost = await db.kxPost.findUnique({
      where: { id: postId },
      select: { id: true, isDeleted: true, status: true },
    });
    if (!parentPost || parentPost.isDeleted) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }
    if (parentPost.status === "LOCKED") {
      return NextResponse.json(
        { error: "This discussion is locked. No new comments are accepted." },
        { status: 400 }
      );
    }
  }

  if (answerId) {
    const parentAnswer = await db.kxAnswer.findUnique({
      where: { id: answerId },
      include: {
        post: {
          select: { id: true, isDeleted: true, status: true },
        },
      },
    });
    if (!parentAnswer || parentAnswer.isDeleted) {
      return NextResponse.json({ error: "Answer not found." }, { status: 404 });
    }
    if (parentAnswer.post?.status === "LOCKED") {
      return NextResponse.json(
        { error: "This discussion is locked. No new comments are accepted." },
        { status: 400 }
      );
    }
  }

  const userId = eligibility.session.user.id;

  const comment = await db.kxComment.create({
    data: {
      postId: postId || null,
      answerId: answerId || null,
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

  const viewer = {
    id: userId,
    role: eligibility.role,
  };

  const serialized = {
    id: comment.id,
    postId: comment.postId,
    answerId: comment.answerId,
    authorId: comment.isAnonymous && viewer.role !== "ADMIN" ? null : comment.authorId,
    body: comment.body,
    isAnonymous: comment.isAnonymous,
    isDeleted: comment.isDeleted,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: serializeAuthor(comment.author, comment.isAnonymous, viewer),
  };

  return NextResponse.json({ success: true, comment: serialized }, { status: 201 });
}
