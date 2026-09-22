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

  // Restricted to PROFESSOR and ADMIN roles
  if (eligibility.role !== "ADMIN" && eligibility.role !== "INSTRUCTOR") {
    return NextResponse.json(
      { error: "Forbidden: Moderation queue is restricted to instructors and administrators." },
      { status: 403 }
    );
  }

  const [pendingFlags, recentActions] = await Promise.all([
    db.kxFlag.findMany({
      where: { status: "PENDING" },
      include: {
        reporter: {
          select: { id: true, name: true, role: true, email: true },
        },
        post: {
          select: { id: true, title: true, isDeleted: true, status: true },
        },
        answer: {
          select: { id: true, body: true, postId: true, isDeleted: true },
        },
        comment: {
          select: { id: true, body: true, postId: true, isDeleted: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.kxModerationAction.findMany({
      include: {
        moderator: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    flags: pendingFlags,
    actions: recentActions,
  });
}
