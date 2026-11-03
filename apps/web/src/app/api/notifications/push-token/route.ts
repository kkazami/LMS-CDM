import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST notifications/push-token/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ success: false, message: 'Remote push delivery is not enabled. Updates are available in the in-app Inbox.' }, { status: 501 });
  } catch (error) {
    console.error('PUSH_TOKEN_ERROR', error);
    return NextResponse.json({ message: 'Failed to register push token.' }, { status: 500 });
  }
}
