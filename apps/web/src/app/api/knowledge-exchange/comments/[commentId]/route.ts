import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
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

  const { commentId } = await params;
  const comment = await db.kxComment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      isDeleted: true,
      post: {
        select: { authorId: true },
      },
      answer: {
        select: {
          authorId: true,
          post: {
            select: { authorId: true },
          },
        },
      },
    },
  });

  if (!comment || comment.isDeleted) {
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });
  }

  const userId = eligibility.session.user.id;
  const isCommentAuthor = comment.authorId === userId;
  const postAuthorId = comment.post?.authorId || comment.answer?.post?.authorId;
  const isPostAuthor = Boolean(postAuthorId && postAuthorId === userId);

  const role = (eligibility.role || "").toUpperCase();
  const isStaff = role === "ADMIN" || role === "INSTRUCTOR";

  if (!isCommentAuthor && !isPostAuthor && !isStaff) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to delete this comment." },
      { status: 403 }
    );
  }

  await db.kxComment.update({
    where: { id: commentId },
    data: { isDeleted: true },
  });

  return NextResponse.json({ success: true, message: "Comment deleted." });
}
