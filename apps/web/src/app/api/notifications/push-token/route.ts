import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token, deviceType } = body;

    return NextResponse.json({ success: true, token, deviceType });
  } catch (error) {
    console.error('PUSH_TOKEN_ERROR', error);
    return NextResponse.json({ message: 'Failed to register push token.' }, { status: 500 });
  }
}
