import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { serializeAuthor } from "@/features/knowledge-exchange/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

  const userId = eligibility.session.user.id;

  const bookmarks = await db.kxBookmark.findMany({
    where: {
      userId,
      post: { isDeleted: false },
    },
    include: {
      post: {
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
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const viewer = {
    id: userId,
    role: eligibility.role,
  };

  const savedPosts = bookmarks.map((b) => ({
    ...b.post,
    authorId: b.post.isAnonymous && viewer.role !== "ADMIN" ? null : b.post.authorId,
    createdAt: b.post.createdAt.toISOString(),
    updatedAt: b.post.updatedAt.toISOString(),
    bookmarkedAt: b.createdAt.toISOString(),
    isBookmarked: true,
    author: serializeAuthor(b.post.author, b.post.isAnonymous, viewer),
    tags: b.post.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug,
      description: pt.tag.description,
      category: pt.tag.category,
      postCount: pt.tag.postCount,
    })),
  }));

  return NextResponse.json({ posts: savedPosts });
}

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

  const { postId } = await request.json().catch(() => ({}));
  if (!postId) {
    return NextResponse.json({ error: "postId is required." }, { status: 400 });
  }

  const post = await db.kxPost.findUnique({
    where: { id: postId },
    select: { id: true, isDeleted: true },
  });

  if (!post || post.isDeleted) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const userId = eligibility.session.user.id;

  const existing = await db.kxBookmark.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  if (existing) {
    await db.kxBookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, bookmarked: false });
  } else {
    await db.kxBookmark.create({
      data: {
        userId,
        postId,
      },
    });
    return NextResponse.json({ success: true, bookmarked: true });
  }
}
