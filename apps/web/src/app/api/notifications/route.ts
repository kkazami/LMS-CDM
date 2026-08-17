import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications?limit=50
 * Fetches notifications for the authenticated user, newest first.
 * Returns { notifications: [...], unreadCount: number }
 */
export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    });
  } catch (error) {
    console.error("NOTIFICATIONS_GET_ERROR", error);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

/**
 * PATCH /api/notifications
 * Body: { action: "markAllRead" } or { action: "markRead", id: "..." }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await request.json()) as { action: string; id?: string };

    if (body.action === "markAllRead") {
      await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "markRead" && body.id) {
      await db.notification.updateMany({
        where: { id: body.id, userId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("NOTIFICATIONS_PATCH_ERROR", error);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
