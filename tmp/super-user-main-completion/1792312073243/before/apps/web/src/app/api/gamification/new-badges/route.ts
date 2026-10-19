import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { getBadgeById } from "@/lib/gamification/badge-catalog";

export const dynamic = "force-dynamic";

// GET — Returns any unviewed new badges for the current user
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json([], { status: 401 });
  }

  const profile = await db.gamificationProfile.findUnique({
    where: { studentId: session.user.id },
    select: {
      badges: {
        where: { isNew: true },
        select: { id: true, badgeRuleId: true, earnedAt: true },
      },
    },
  });

  const badges = (profile?.badges ?? []).map((b) => ({
    id: b.id,
    badgeRuleId: b.badgeRuleId,
    earnedAt: b.earnedAt.toISOString(),
    definition: getBadgeById(b.badgeRuleId),
  }));

  return NextResponse.json(badges);
}

// POST — Mark badges as viewed (clear the isNew flag)
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const { badgeIds } = (await req.json()) as { badgeIds: string[] };

    if (Array.isArray(badgeIds) && badgeIds.length > 0) {
      await db.studentBadge.updateMany({
        where: { id: { in: badgeIds } },
        data: { isNew: false, notifiedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("MARK_BADGES_VIEWED_ERROR", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
