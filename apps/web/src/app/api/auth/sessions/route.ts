import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { recentlyAuthenticated, sessionExpired } from '@/lib/session-policy';
import { SESSION_COOKIE_NAMES, sessionCookieAttributes } from '@/lib/session-cookie';
import { limitAuthenticatedOperation } from '@/lib/authenticated-rate-limits';
import { AccessError } from '@/lib/super-user-v1/actor';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';

const privateHeaders = { 'Cache-Control': 'private, no-store' };

function reply(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: privateHeaders });
}

export async function DELETE(req: Request) {
  const ceilingDenial = await denyLegacyApi(req, "DELETE auth/sessions/route.ts");
  if (ceilingDenial) {
    ceilingDenial.headers.set('Cache-Control', privateHeaders['Cache-Control']);
    return ceilingDenial;
  }

  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return reply('Unauthorized', 401);
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");

    const allParameter = searchParams.get('all');
    const all = allParameter === '1';
    if (searchParams.getAll('id').length > 1 || searchParams.getAll('all').length > 1 ||
        (all ? sessionId !== null : allParameter !== null || !sessionId || sessionId.length > 128)) {
      return reply('Choose one session or all devices.', 400);
    }
    const needsRecentSession = all || sessionId !== session.id;
    if (needsRecentSession && !recentlyAuthenticated(session.createdAt)) {
      return reply('Sign in again before ending other sessions.', 403);
    }
    await limitAuthenticatedOperation('sessionRevocation', session.userId);
    const deleted = await db.$transaction(async tx => {
      await lockAccounts(tx, [session.userId]);
      const actor = await tx.session.findFirst({ where: { id: session.id, userId: session.userId, tokenHash: session.tokenHash } });
      if (!actor || sessionExpired(actor) || (needsRecentSession && !recentlyAuthenticated(actor.createdAt))) {
        throw new AccessError(401, 'Sign in again to continue.');
      }
      return tx.session.deleteMany({ where: { userId: session.userId, ...(all ? {} : { id: sessionId! }) } });
    });
    if (!deleted.count) {
      return reply('Session not found or unauthorized', 404);
    }
    const response = NextResponse.json({ success: true, message: all ? 'Signed out on all devices.' : 'Session revoked' }, { headers: privateHeaders });
    if (all || sessionId === session.id) {
      for (const name of SESSION_COOKIE_NAMES) response.cookies.set(name, '', { ...sessionCookieAttributes(name), maxAge: 0 });
    }
    return response;
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    const message = error instanceof AccessError ? error.message : 'Session management is temporarily unavailable.';
    return reply(message, status);
  }
}
