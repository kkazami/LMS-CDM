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

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (!q) {
    return NextResponse.json({ posts: [] });
  }

  const institute = await db.institute.findUnique({
    where: { code: "ics" },
    select: { id: true },
  });

  const posts = await db.kxPost.findMany({
    where: {
      isDeleted: false,
      ...(institute ? { instituteId: institute.id } : {}),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { body: { contains: q, mode: "insensitive" } },
      ],
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
      tags: {
        include: { tag: true },
      },
      course: {
        select: { id: true, code: true, title: true },
      },
      votes: {
        where: { userId: eligibility.session.user.id },
        select: { value: true },
      },
    },
    orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }],
    take: 25,
  });

  const viewer = {
    id: eligibility.session.user.id,
    role: eligibility.role,
  };

  const serialized = posts.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    postType: p.postType,
    status: p.status,
    isAnonymous: p.isAnonymous,
    authorId: p.isAnonymous && viewer.role !== "ADMIN" ? null : p.authorId,
    viewCount: p.viewCount,
    voteCount: p.voteCount,
    answerCount: p.answerCount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    userVote: p.votes[0]?.value || 0,
    author: serializeAuthor(p.author, p.isAnonymous, viewer),
    tags: p.tags.map((pt) => ({
      id: pt.tag.id,
      name: pt.tag.name,
      slug: pt.tag.slug,
      category: pt.tag.category,
      postCount: pt.tag.postCount,
    })),
    course: p.course,
  }));

  return NextResponse.json({ posts: serialized });
}
