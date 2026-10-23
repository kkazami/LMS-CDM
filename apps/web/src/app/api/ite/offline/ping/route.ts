/**
 * apps/web/src/app/api/ite/offline/ping/route.ts
 *
 * GET /api/ite/offline/ping
 * Small same-origin connectivity verification endpoint.
 * Returns 204 No Content with Cache-Control: no-store.
 * Strictly ITE students only (instructors, admins, ICS/IBE get 403).
 */

import { NextResponse } from "next/server";
import { requireOfflineStudentActor } from "@/lib/ite/offline/guard";
import { HttpError } from "@/lib/practicum/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireOfflineStudentActor(request);

    return new Response(null, {
      status: 204,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status, headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
