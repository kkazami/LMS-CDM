import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { UpdatePostSchema } from "@/features/knowledge-exchange/schemas";
import { serializeAuthor } from "@/features/knowledge-exchange/utils";

export const dynamic = "force-dynamic";

export async function GET(
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

  // Increment viewCount
  await db.kxPost
    .update({
      where: { id: postId },
      data: { viewCount: { increment: 1 } },
    })
    .catch(() => {});

  const post = await db.kxPost.findUnique({
    where: { id: postId },
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
      tags: {
        include: { tag: true },
      },
      course: {
        select: { id: true, code: true, title: true },
      },
      syllabusItem: {
        select: { id: true, title: true, type: true, enableIntegrityMonitoring: true },
      },
      votes: {
        where: { userId: eligibility.session.user.id },
        select: { value: true },
      },
      bookmarks: {
        where: { userId: eligibility.session.user.id },
        select: { id: true },
      },
      comments: {
        where: { isDeleted: false, answerId: null },
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
        orderBy: { createdAt: "asc" },
      },
      answers: {
        where: { isDeleted: false },
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
          verifiedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          votes: {
            where: { userId: eligibility.session.user.id },
            select: { value: true },
          },
          comments: {
            where: { isDeleted: false },
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
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: [{ isAccepted: "desc" }, { voteCount: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!post || post.isDeleted) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const viewer = {
    id: eligibility.session.user.id,
    role: eligibility.role,
  };
  const isViewerAdmin = viewer.role === "ADMIN";

  const serializedAnswers = post.answers.map((a) => {
    const userVote = a.votes[0]?.value || 0;
    return {
      id: a.id,
      postId: a.postId,
      authorId: a.isAnonymous && !isViewerAdmin ? null : a.authorId,
      body: a.body,
      isAnonymous: a.isAnonymous,
      isAccepted: a.isAccepted,
      isVerified: a.isVerified,
      verifiedById: a.verifiedById,
      verifiedBy: a.verifiedBy,
      voteCount: a.voteCount,
      userVote,
      isDeleted: a.isDeleted,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      author: serializeAuthor(a.author, a.isAnonymous, viewer),
      comments: a.comments.map((c) => ({
        id: c.id,
        postId: c.postId,
        answerId: c.answerId,
        authorId: c.isAnonymous && !isViewerAdmin ? null : c.authorId,
        body: c.body,
        isAnonymous: c.isAnonymous,
        isDeleted: c.isDeleted,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        author: serializeAuthor(c.author, c.isAnonymous, viewer),
      })),
    };
  });

  const serializedPost = {
    id: post.id,
    title: post.title,
    body: post.body,
    postType: post.postType,
    status: post.status,
    isAnonymous: post.isAnonymous,
    authorId: post.isAnonymous && !isViewerAdmin ? null : post.authorId,
    instituteId: post.instituteId,
    courseId: post.courseId,
    syllabusItemId: post.syllabusItemId,
    viewCount: post.viewCount,
    voteCount: post.voteCount,
    answerCount: post.answerCount,
    isPinned: post.isPinned,
    isDeleted: post.isDeleted,
    closeReason: post.closeReason,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    userVote: post.votes[0]?.value || 0,
    isBookmarked: post.bookmarks.length > 0,
    author: serializeAuthor(post.author, post.isAnonymous, viewer),
    tags: post.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug,
      description: pt.tag.description,
      category: pt.tag.category,
      postCount: pt.tag.postCount,
    })),
    course: post.course,
    syllabusItem: post.syllabusItem,
    comments: post.comments.map((c) => ({
      id: c.id,
      postId: c.postId,
      answerId: c.answerId,
      authorId: c.isAnonymous && !isViewerAdmin ? null : c.authorId,
      body: c.body,
      isAnonymous: c.isAnonymous,
      isDeleted: c.isDeleted,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      author: serializeAuthor(c.author, c.isAnonymous, viewer),
    })),
    answers: serializedAnswers,
  };

  return NextResponse.json({ post: serializedPost });
}

export async function PATCH(
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
  const post = await db.kxPost.findUnique({ where: { id: postId } });
  if (!post || post.isDeleted) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const isAuthor = post.authorId === eligibility.session.user.id;

  if (!isAuthor) {
    return NextResponse.json(
      { error: "Forbidden: Only the original author can edit this post." },
      { status: 403 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = UpdatePostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const { title, body, summary, tagIds } = parsed.data;

  const updatedPost = await db.$transaction(async (tx) => {
    // Record revision
    await tx.kxRevision.create({
      data: {
        postId,
        editorId: eligibility.session.user.id,
        title: title || post.title,
        body: body || post.body,
        summary: summary || "Post updated",
      },
    });

    // Update tags if provided
    if (tagIds) {
      await tx.kxPostTag.deleteMany({ where: { postId } });
      for (const tagId of tagIds) {
        await tx.kxPostTag.create({
          data: { postId, tagId },
        });
      }
    }

    // Update post record
    return await tx.kxPost.update({
      where: { id: postId },
      data: {
        title: title ?? undefined,
        body: body ?? undefined,
      },
    });
  });

  return NextResponse.json({ success: true, post: updatedPost });
}

export async function DELETE(
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
  const post = await db.kxPost.findUnique({ where: { id: postId } });
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const role = (eligibility.role || "").toUpperCase();
  const isAuthor = post.authorId === eligibility.session.user.id;
  const isStaff = role === "ADMIN" || role === "INSTRUCTOR";

  if (!isAuthor && !isStaff) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to delete this post." },
      { status: 403 }
    );
  }

  // Soft delete
  await db.kxPost.update({
    where: { id: postId },
    data: { isDeleted: true },
  });

  return NextResponse.json({ success: true, message: "Post deleted." });
}
