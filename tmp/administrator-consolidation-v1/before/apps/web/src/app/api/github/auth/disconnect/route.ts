import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export async function DELETE(req: NextRequest) {
  const ceilingDenial = await denyLegacyApi(req, "DELETE github/auth/disconnect/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await db.githubToken.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disconnect GitHub:', error);
    return NextResponse.json({ error: 'Failed to disconnect GitHub account.' }, { status: 500 });
  }
}
