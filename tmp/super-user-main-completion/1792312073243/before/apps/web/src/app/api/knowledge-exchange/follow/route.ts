import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { z } from "zod";

export const dynamic = "force-dynamic";

const followSchema = z.object({
  targetType: z.enum(["POST", "TAG"]),
  targetId: z.string().min(1),
});

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
  const targetType = searchParams.get("targetType") as "POST" | "TAG" | null;
  const targetId = searchParams.get("targetId");

  if (!targetType || !targetId) {
    return NextResponse.json({ error: "targetType and targetId are required" }, { status: 400 });
  }

  const userId = eligibility.session.user.id;

  const follow = targetType === "POST"
    ? await db.kxFollow.findUnique({
        where: {
          userId_postId: { userId, postId: targetId },
        },
      })
    : await db.kxFollow.findUnique({
        where: {
          userId_tagId: { userId, tagId: targetId },
        },
      });

  return NextResponse.json({ isFollowing: !!follow });
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

  try {
    const body = await request.json();
    const { targetType, targetId } = followSchema.parse(body);
    const userId = eligibility.session.user.id;

    if (targetType === "POST") {
      const post = await db.kxPost.findUnique({
        where: { id: targetId },
        select: { id: true, isDeleted: true },
      });
      if (!post || post.isDeleted) {
        return NextResponse.json({ error: "Post not found." }, { status: 404 });
      }

      const existing = await db.kxFollow.findUnique({
        where: {
          userId_postId: { userId, postId: targetId },
        },
      });

      if (existing) {
        await db.kxFollow.delete({ where: { id: existing.id } });
        return NextResponse.json({ isFollowing: false, action: "unfollowed" });
      } else {
        await db.kxFollow.create({
          data: {
            userId,
            postId: targetId,
          },
        });
        return NextResponse.json({ isFollowing: true, action: "followed" });
      }
    } else {
      const tag = await db.kxTag.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!tag) {
        return NextResponse.json({ error: "Tag not found." }, { status: 404 });
      }

      const existing = await db.kxFollow.findUnique({
        where: {
          userId_tagId: { userId, tagId: targetId },
        },
      });

      if (existing) {
        await db.kxFollow.delete({ where: { id: existing.id } });
        return NextResponse.json({ isFollowing: false, action: "unfollowed" });
      } else {
        await db.kxFollow.create({
          data: {
            userId,
            tagId: targetId,
          },
        });
        return NextResponse.json({ isFollowing: true, action: "followed" });
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.flatten() }, { status: 422 });
    }
    console.error("Error toggling follow:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
