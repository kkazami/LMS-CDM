import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

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
  if (eligibility.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden: Admin authorization required." },
      { status: 403 }
    );
  }

  // Find top questions from past week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const topPosts = await db.kxPost.findMany({
    where: {
      isDeleted: false,
      createdAt: { gte: oneWeekAgo },
    },
    orderBy: [{ voteCount: "desc" }, { answerCount: "desc" }],
    take: 3,
  });

  const featuredTitle = topPosts[0]?.title || "Latest ICS Discussions";
  const featuredLink = topPosts[0]
    ? `/ics/knowledge-exchange/post/${topPosts[0].id}`
    : `/ics/knowledge-exchange`;

  // Create digest notification for the current user (or for all ICS users if admin)
  const notification = await db.kxNotification.create({
    data: {
      userId: eligibility.session.user.id,
      type: "WEEKLY_DIGEST",
      title: "Weekly Knowledge Exchange Digest",
      message: `Top discussion this week: "${featuredTitle}". Check out active questions and share your expertise!`,
      link: featuredLink,
      metadata: JSON.stringify({
        topPostIds: topPosts.map((p) => p.id),
      }),
    },
  });

  return NextResponse.json({
    success: true,
    notification,
  });
}
