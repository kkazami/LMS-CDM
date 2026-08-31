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
    const { isAnonymized } = (await req.json()) as { isAnonymized: boolean };

    await db.gamificationProfile.upsert({
      where: { studentId: session.user.id },
      create: {
        studentId: session.user.id,
        isLeaderboardAnonymized: Boolean(isAnonymized),
      },
      update: {
        isLeaderboardAnonymized: Boolean(isAnonymized),
      },
    });

    return NextResponse.json({ ok: true, isAnonymized: Boolean(isAnonymized) });
  } catch (error) {
    console.error("TOGGLE_ANONYMITY_ERROR", error);
    return NextResponse.json({ error: "Failed to update anonymity" }, { status: 500 });
  }
}
