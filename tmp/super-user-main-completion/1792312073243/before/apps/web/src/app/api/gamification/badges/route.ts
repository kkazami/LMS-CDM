import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth-session';
import { db } from '@/lib/db';
import { BADGE_CATALOG } from '@/lib/gamification/badge-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  try {
    const profile = await db.gamificationProfile.findUnique({
      where: { studentId: session.user.id },
      include: {
        badges: true,
      },
    });

    const earnedMap = new Map(
      (profile?.badges || []).map((b) => [b.badgeRuleId, b])
    );

    const badges = BADGE_CATALOG.map((b) => {
      const earned = earnedMap.get(b.id);
      return {
        id: b.id,
        badgeRuleId: b.id,
        title: b.name,
        description: b.description,
        category: b.category.toUpperCase() as
          | 'LEARNING'
          | 'STREAK'
          | 'EXCELLENCE'
          | 'LEVEL'
          | 'SPECIAL',
        icon: b.iconName,
        isUnlocked: Boolean(earned),
        earnedAt: earned?.earnedAt ? earned.earnedAt.toISOString() : null,
        isNew: earned?.isNew ?? false,
      };
    });

    return NextResponse.json({ badges });
  } catch (error) {
    console.error('GET_BADGES_API_ERROR', error);
    return NextResponse.json({ message: 'Failed to fetch badges' }, { status: 500 });
  }
}
