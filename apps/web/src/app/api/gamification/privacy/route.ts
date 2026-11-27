import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { leaderboardPhotoPreference, leaderboardVisibility, leaderboardVisibilityOptions } from "@/lib/leaderboard-privacy";
import { profilePreferences } from "@/lib/profile-banner";

export const dynamic = "force-dynamic";

const privacyUpdate = z.object({
  visibility: z.enum(leaderboardVisibilityOptions).optional(),
  isAnonymized: z.boolean().optional(),
  isLeaderboardAnonymized: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ceilingDenial = await denyLegacyApi(req, "POST gamification/privacy/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const result = privacyUpdate.safeParse(await req.json().catch(() => null));
    if (!result.success) return NextResponse.json({ error: 'Choose a valid leaderboard setting.' }, { status: 400 });
    const { visibility, isLeaderboardAnonymized, isAnonymized } = result.data;
    const isAnon = visibility ? visibility === 'anonymous' : isLeaderboardAnonymized ?? isAnonymized;
    if (isAnon === undefined) return NextResponse.json({ error: 'Choose a leaderboard setting.' }, { status: 400 });
    const studentId = session.user.id;
    const savedVisibility = await db.$transaction(async tx => {
      const profile = await tx.gamificationProfile.upsert({
        where: { studentId },
        create: { studentId, isLeaderboardAnonymized: isAnon },
        update: { isLeaderboardAnonymized: isAnon },
        select: { isLeaderboardAnonymized: true, student: { select: { preferences: true } } },
      });
      // The native anonymity switch keeps the student's separate choice about photos.
      if (visibility !== 'photo' && visibility !== 'name') return leaderboardVisibility(profile, profile.student.preferences);

      const previous = profile.student.preferences;
      await tx.user.update({
        where: { id: studentId, preferences: previous },
        data: { preferences: JSON.stringify({ ...profilePreferences(previous), [leaderboardPhotoPreference]: visibility === 'photo' }) },
        select: { id: true },
      });
      return visibility;
    });

    return NextResponse.json({ ok: true, success: true, isAnonymized: isAnon, visibility: savedVisibility });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Your settings changed. Try again.' }, { status: 409 });
    }
    console.error("TOGGLE_ANONYMITY_ERROR", error);
    return NextResponse.json({ error: "Failed to update anonymity" }, { status: 500 });
  }
}

export const PUT = POST;
