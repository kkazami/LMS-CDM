import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/api-auth';
import { db } from '@/lib/db';

export const dynamic = "force-dynamic";

/**
 * In-memory / database push token registry
 */
const pushSubscriptions = new Map<string, { endpoint: string; keys?: { auth: string; p256dh: string }; deviceType?: string; updatedAt: Date }>();

/**
 * POST /api/notifications/subscribe
 * Registers a Web Push / APNs / FCM subscription for the user.
 */
export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, deviceType = 'web' } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ message: 'Valid subscription object required.' }, { status: 400 });
    }

    pushSubscriptions.set(session.user.id, {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      deviceType,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Push notification subscription registered successfully.',
    });
  } catch (error) {
    console.error('PUSH_SUBSCRIBE_ERROR', error);
    return NextResponse.json({ message: 'Failed to subscribe to push notifications.' }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/subscribe
 * Unsubscribes the user device from push notifications.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    pushSubscriptions.delete(session.user.id);
    return NextResponse.json({ success: true, message: 'Unsubscribed from push notifications.' });
  } catch (error) {
    console.error('PUSH_UNSUBSCRIBE_ERROR', error);
    return NextResponse.json({ message: 'Failed to unsubscribe.' }, { status: 500 });
  }
}
