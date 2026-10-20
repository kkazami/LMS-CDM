/**
 * apps/web/src/app/api/ite/focus/sessions/[id]/route.ts
 *
 * PATCH /api/ite/focus/sessions/[id]
 * POST /api/ite/focus/sessions/[id] (alias for navigator.sendBeacon)
 *
 * Updates an ongoing focus session (heartbeat or end).
 */

import { NextResponse } from "next/server";
import { errorResponse, HttpError } from "@/lib/practicum/http";
import { requireFocusStudentActor } from "@/lib/ite/focus/guard";
import { updateFocusSession } from "@/lib/ite/focus/service";
import type { UpdateFocusSessionInput } from "@/lib/ite/focus/types";

async function parseBody(request: Request): Promise<UpdateFocusSessionInput> {
  let parsed: unknown;
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      parsed = await request.json();
    } catch {
      throw new HttpError(400, "Invalid JSON body.");
    }
  } else {
    // navigator.sendBeacon often sends as text/plain
    const text = await request.text();
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new HttpError(400, "Invalid request payload.");
    }
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new HttpError(400, "Payload must be an object.");
  }

  const rec = parsed as Record<string, unknown>;
  const action = rec.action;
  if (action !== "heartbeat" && action !== "end") {
    throw new HttpError(400, "action must be 'heartbeat' or 'end'.");
  }

  return {
    action,
    focusedSeconds: rec.focusedSeconds !== undefined ? Number(rec.focusedSeconds) : undefined,
    tabSwitchCount: rec.tabSwitchCount !== undefined ? Number(rec.tabSwitchCount) : undefined,
  };
}

async function handleUpdate(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireFocusStudentActor(request);
    const { id } = await context.params;
    const input = await parseBody(request);
    const session = await updateFocusSession(id, actor, input);

    return NextResponse.json({ session });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context);
}

// POST alias for navigator.sendBeacon
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, context);
}
