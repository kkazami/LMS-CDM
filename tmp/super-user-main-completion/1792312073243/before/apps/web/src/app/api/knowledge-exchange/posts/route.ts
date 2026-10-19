import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { CreatePostSchema } from "@/features/knowledge-exchange/schemas";
import { serializeAuthor } from "@/features/knowledge-exchange/utils";
import { awardExpForQuestion } from "@/lib/gamification/kx-exp";
import { KX_FEED_PAGE_SIZE } from "@/features/knowledge-exchange/constants";
import type { Prisma } from "@prisma/client";

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

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "all";
  const sort = searchParams.get("sort") || "newest";
  const search = searchParams.get("search")?.trim();
  const tag = searchParams.get("tag")?.trim();
  const courseId = searchParams.get("courseId")?.trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") || String(KX_FEED_PAGE_SIZE), 10))
  );
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.KxPostWhereInput = {
    isDeleted: false,
  };

  // Institute scoping: get the institute ID for ICS
  const institute = await db.institute.findUnique({
    where: { code: "ics" },
    select: { id: true },
  });
  if (institute) {
    where.instituteId = institute.id;
  }

  // Tab filtering
  if (tab === "unanswered") {
    where.answerCount = 0;
    where.status = "OPEN";
  } else if (tab === "answered") {
    where.status = "ANSWERED";
  } else if (tab === "discussions") {
    where.postType = "DISCUSSION";
  } else if (tab === "my-posts") {
    where.authorId = eligibility.session.user.id;
  }

  // Course filtering
  if (courseId) {
    where.courseId = courseId;
  }

  // Tag filtering
  if (tag) {
    where.tags = {
      some: {
        tag: {
          slug: tag.toLowerCase(),
        },
      },
    };
  }

  // Full-text search across title and body
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sorting
  let orderBy: Prisma.KxPostOrderByWithRelationInput[] = [{ isPinned: "desc" }];
  if (sort === "votes") {
    orderBy.push({ voteCount: "desc" }, { createdAt: "desc" });
  } else if (sort === "active") {
    orderBy.push({ updatedAt: "desc" });
  } else {
    // Default newest
    orderBy.push({ createdAt: "desc" });
  }

  const [posts, totalCount] = await Promise.all([
    db.kxPost.findMany({
      where,
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
        answers: {
          where: { isDeleted: false },
          orderBy: [
            { isAccepted: "desc" },
            { isVerified: "desc" },
            { voteCount: "desc" },
            { createdAt: "asc" },
          ],
          take: 1,
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
        },
        comments: {
          where: { isDeleted: false, answerId: null },
          orderBy: { createdAt: "asc" },
          take: 1,
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
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
    db.kxPost.count({ where }),
  ]);

  const viewer = {
    id: eligibility.session.user.id,
    role: eligibility.role,
  };
  const isViewerAdmin = viewer.role === "ADMIN";

  const serializedPosts = posts.map((p) => {
    const userVote = p.votes[0]?.value || 0;
    const isBookmarked = p.bookmarks.length > 0;

    const topAnswerRaw = p.answers?.[0];
    const topAnswer = topAnswerRaw
      ? {
          id: topAnswerRaw.id,
          body: topAnswerRaw.body,
          isAccepted: topAnswerRaw.isAccepted,
          isVerified: topAnswerRaw.isVerified,
          voteCount: topAnswerRaw.voteCount,
          createdAt: topAnswerRaw.createdAt.toISOString(),
          author: serializeAuthor(topAnswerRaw.author, topAnswerRaw.isAnonymous, viewer),
        }
      : null;

    const topCommentRaw = !topAnswer && p.comments?.[0];
    const topComment = topCommentRaw
      ? {
          id: topCommentRaw.id,
          body: topCommentRaw.body,
          createdAt: topCommentRaw.createdAt.toISOString(),
          author: serializeAuthor(topCommentRaw.author, topCommentRaw.isAnonymous, viewer),
        }
      : null;

    return {
      id: p.id,
      title: p.title,
      body: p.body,
      postType: p.postType,
      status: p.status,
      isAnonymous: p.isAnonymous,
      authorId: p.isAnonymous && !isViewerAdmin ? null : p.authorId,
      instituteId: p.instituteId,
      courseId: p.courseId,
      syllabusItemId: p.syllabusItemId,
      viewCount: p.viewCount,
      voteCount: p.voteCount,
      answerCount: p.answerCount,
      isPinned: p.isPinned,
      isDeleted: p.isDeleted,
      closeReason: p.closeReason,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      userVote,
      isBookmarked,
      topAnswer,
      topComment,
      author: serializeAuthor(p.author, p.isAnonymous, viewer),
      tags: p.tags.map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
        slug: pt.tag.slug,
        description: pt.tag.description,
        category: pt.tag.category,
        postCount: pt.tag.postCount,
      })),
      course: p.course,
      syllabusItem: p.syllabusItem,
    };
  });

  return NextResponse.json({
    posts: serializedPosts,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  });
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

  const json = await request.json().catch(() => null);
  const parsed = CreatePostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input." },
      { status: 400 }
    );
  }

  const { title, body, postType, isAnonymous, tagIds, courseId, syllabusItemId } =
    parsed.data;

  const institute = await db.institute.findUnique({
    where: { code: "ics" },
    select: { id: true },
  });

  if (!institute) {
    return NextResponse.json(
      { error: "Institute of Computer Studies not found." },
      { status: 500 }
    );
  }

  const userId = eligibility.session.user.id;

  // Execute in transaction
  const createdPost = await db.$transaction(async (tx) => {
    const newPost = await tx.kxPost.create({
      data: {
        title,
        body,
        postType,
        isAnonymous,
        authorId: userId,
        instituteId: institute.id,
        courseId: courseId || null,
        syllabusItemId: syllabusItemId || null,
      },
    });

    // Link tags
    if (tagIds.length > 0) {
      for (const tagId of tagIds) {
        await tx.kxPostTag.create({
          data: {
            postId: newPost.id,
            tagId,
          },
        });
        await tx.kxTag.update({
          where: { id: tagId },
          data: { postCount: { increment: 1 } },
        });
      }
    }

    return newPost;
  });

  // Award EXP (+5 for asking/starting post)
  await awardExpForQuestion(userId, createdPost.id).catch(() => {});

  return NextResponse.json({ success: true, post: createdPost }, { status: 201 });
}
