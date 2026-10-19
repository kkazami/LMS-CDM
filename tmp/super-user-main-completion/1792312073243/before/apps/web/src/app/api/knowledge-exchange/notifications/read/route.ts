import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
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
  const json = await request.json().catch(() => ({}));
  const { notificationId, markAll } = json;

  if (markAll) {
    await db.kxNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, message: "All marked as read." });
  }

  if (notificationId) {
    await db.kxNotification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true, message: "Marked as read." });
  }

  return NextResponse.json(
    { error: "Provide notificationId or markAll: true." },
    { status: 400 }
  );
}
