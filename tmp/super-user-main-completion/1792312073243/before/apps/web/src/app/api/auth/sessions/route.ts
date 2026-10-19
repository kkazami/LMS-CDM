import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Ensure the session belongs to the current user before deleting
    const targetSession = await db.session.findUnique({
      where: { id: sessionId },
    });

    if (!targetSession || targetSession.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found or unauthorized" }, { status: 404 });
    }

    await db.session.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ success: true, message: "Session revoked" });
  } catch (error) {
    console.error("[REVOKE_SESSION]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
