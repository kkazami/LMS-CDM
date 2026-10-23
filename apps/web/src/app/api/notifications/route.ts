import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getSessionFromRequest } from "@/lib/api-auth";
import { parseNotificationLimit } from "@/lib/notifications-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications?limit=50
 * Fetches notifications for the authenticated user, newest first.
 * Returns { notifications: [...], unreadCount: number }
 */
export async function GET(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "GET notifications/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = (await getSession()) || (await getSessionFromRequest(request));
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const limit = parseNotificationLimit(searchParams.get("limit"));

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
 * Body: { action: "markAllRead" } or { action: "markRead", id: "..." } or { id: "..." } or { ids: [...] }
 */
export async function PATCH(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "PATCH notifications/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = (await getSession()) || (await getSessionFromRequest(request));
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const userId = session.user.id;
    const body = (await request.json().catch(() => ({}))) as {
      action?: string;
      id?: string;
      ids?: string[];
    };

    if (body.action === "markAllRead") {
      const res = await db.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, count: res.count });
    }

    if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      const res = await db.notification.updateMany({
        where: { id: { in: body.ids }, userId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, count: res.count });
    }

    const notifId = body.id || (body.action === "markRead" ? body.id : undefined);
    if (notifId) {
      const res = await db.notification.updateMany({
        where: { id: notifId, userId },
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, count: res.count });
    }

    return NextResponse.json({ message: "Invalid action." }, { status: 400 });
  } catch (error) {
    console.error("NOTIFICATIONS_PATCH_ERROR", error);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications
 * Query params: ?id=... (single delete) or ?all=true (delete all for user)
 * Body: { id?: string; action?: "deleteAll" | "clearAll" }
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");
    const allParam = searchParams.get("all") === "true";

    let bodyId: string | undefined;
    let bodyAction: string | undefined;

    try {
      const body = (await request.json()) as { id?: string; action?: string };
      if (body) {
        bodyId = body.id;
        bodyAction = body.action;
      }
    } catch {
      // Body may be empty if invoked via query params
    }

    if (allParam || bodyAction === "deleteAll" || bodyAction === "clearAll") {
      const result = await db.notification.deleteMany({
        where: { userId },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    const notifId = idParam || bodyId;
    if (notifId) {
      const result = await db.notification.deleteMany({
        where: { id: notifId, userId },
      });
      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json({ message: "Notification ID or action required." }, { status: 400 });
  } catch (error) {
    console.error("NOTIFICATIONS_DELETE_ERROR", error);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
