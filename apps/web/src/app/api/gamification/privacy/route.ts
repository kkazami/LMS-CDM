import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { isAnonymized?: boolean; isLeaderboardAnonymized?: boolean };
    const isAnon = Boolean(body.isLeaderboardAnonymized ?? body.isAnonymized);

    await db.gamificationProfile.upsert({
      where: { studentId: session.user.id },
      create: {
        studentId: session.user.id,
        isLeaderboardAnonymized: isAnon,
      },
      update: {
        isLeaderboardAnonymized: isAnon,
      },
    });

    return NextResponse.json({ ok: true, success: true, isAnonymized: isAnon });
  } catch (error) {
    console.error("TOGGLE_ANONYMITY_ERROR", error);
    return NextResponse.json({ error: "Failed to update anonymity" }, { status: 500 });
  }
}

export const PUT = POST;
