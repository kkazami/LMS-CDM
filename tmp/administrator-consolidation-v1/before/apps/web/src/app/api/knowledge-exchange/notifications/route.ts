import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET knowledge-exchange/notifications/route.ts");
  if (ceilingDenial) return ceilingDenial;

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

  const [notifications, unreadCount] = await Promise.all([
    db.kxNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.kxNotification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
  });
}
