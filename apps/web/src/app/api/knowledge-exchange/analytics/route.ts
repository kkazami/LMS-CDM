import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

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

  try {
    const [
      totalPosts,
      totalQuestions,
      totalDiscussions,
      answeredQuestions,
      totalAnswers,
      verifiedAnswers,
      totalComments,
      totalTags,
      topTags,
      recentPosts,
    ] = await Promise.all([
      db.kxPost.count({ where: { isDeleted: false } }),
      db.kxPost.count({ where: { postType: "QUESTION", isDeleted: false } }),
      db.kxPost.count({ where: { postType: "DISCUSSION", isDeleted: false } }),
      db.kxPost.count({ where: { status: "ANSWERED", isDeleted: false } }),
      db.kxAnswer.count({ where: { isDeleted: false } }),
      db.kxAnswer.count({ where: { isVerified: true, isDeleted: false } }),
      db.kxComment.count(),
      db.kxTag.count(),
      db.kxTag.findMany({
        orderBy: { postCount: "desc" },
        take: 8,
      }),
      db.kxPost.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          postType: true,
          status: true,
          voteCount: true,
          answerCount: true,
          createdAt: true,
        },
      }),
    ]);

    const resolutionRate = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

    return NextResponse.json({
      totalPosts,
      totalQuestions,
      totalDiscussions,
      answeredQuestions,
      totalAnswers,
      verifiedAnswers,
      totalComments,
      totalTags,
      resolutionRate,
      topTags,
      recentPosts,
    });
  } catch (error) {
    console.error("Error loading KX analytics:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
