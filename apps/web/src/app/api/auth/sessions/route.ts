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

export async function DELETE(req: Request) {
  const ceilingDenial = await denyLegacyApi(req, "DELETE auth/sessions/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSession(req);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("id");

    const all = searchParams.get('all') === '1';
    if (all && sessionId) return NextResponse.json({ error: 'Choose one session or all devices.' }, { status: 400, headers: privateHeaders });
    if (!sessionId && !all) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }
    if (all && !recentlyAuthenticated(session.createdAt)) {
      return NextResponse.json({ error: 'Sign in again before ending every session.' }, { status: 403, headers: privateHeaders });
    }
    await limitAuthenticatedOperation('sessionRevocation', session.userId);
    const deleted = await db.$transaction(async tx => {
      await lockAccounts(tx, [session.userId]);
      const actor = await tx.session.findFirst({ where: { id: session.id, userId: session.userId, tokenHash: session.tokenHash } });
      if (!actor || sessionExpired(actor) || (all && !recentlyAuthenticated(actor.createdAt))) {
        throw new AccessError(401, 'Sign in again to continue.');
      }
      return tx.session.deleteMany({ where: { userId: session.userId, ...(all ? {} : { id: sessionId! }) } });
    });
    if (!deleted.count) {
      return NextResponse.json({ error: "Session not found or unauthorized" }, { status: 404 });
    }
    const response = NextResponse.json({ success: true, message: all ? 'Signed out on all devices.' : 'Session revoked' }, { headers: privateHeaders });
    if (all || sessionId === session.id) {
      for (const name of SESSION_COOKIE_NAMES) response.cookies.set(name, '', { ...sessionCookieAttributes(name), maxAge: 0 });
    }
    return response;
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    const message = error instanceof AccessError ? error.message : 'Session management is temporarily unavailable.';
    return NextResponse.json({ error: message }, { status, headers: privateHeaders });
  }
}
