import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, errorResponse, readJson } from "@/lib/practicum/http";
import { requireIctLabApiActor } from "@/lib/ict-lab/guard";
import {
  checkProjectOwnership,
  computeProjectByteSize,
  validatePlaygroundProjectInput,
} from "@/lib/ict-lab/rules";
import type { IctPlaygroundProjectDTO } from "@/lib/ict-lab/types";

function toProjectDTO(row: {
  id: string;
  userId: string;
  title: string;
  html: string;
  css: string;
  js: string;
  createdAt: Date;
  updatedAt: Date;
}): IctPlaygroundProjectDTO {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    html: row.html,
    css: row.css,
    js: row.js,
    byteSize: computeProjectByteSize(row.html, row.css, row.js),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireIctLabApiActor(request);
    const { id } = await context.params;

    const existing = await db.ictPlaygroundProject.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new HttpError(404, "Project not found.");
    }
    if (!checkProjectOwnership(existing.userId, actor.userId)) {
      throw new HttpError(403, "You do not have permission to access this project.");
    }

    return NextResponse.json({ project: toProjectDTO(existing) });
  } catch (err) {
    return errorResponse(err);
  }
}

async function handleUpdate(request: Request, context: RouteContext) {
  try {
    const actor = await requireIctLabApiActor(request);
    const { id } = await context.params;

    const existing = await db.ictPlaygroundProject.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new HttpError(404, "Project not found.");
    }
    if (!checkProjectOwnership(existing.userId, actor.userId)) {
      throw new HttpError(403, "You do not have permission to modify this project.");
    }

    const rawBody = (await readJson(request)) as Record<string, unknown> | null;
    if (!rawBody || typeof rawBody !== "object") {
      throw new HttpError(400, "Invalid JSON payload.");
    }

    const mergedPayload = {
      title: typeof rawBody.title === "string" ? rawBody.title : existing.title,
      html: typeof rawBody.html === "string" ? rawBody.html : existing.html,
      css: typeof rawBody.css === "string" ? rawBody.css : existing.css,
      js: typeof rawBody.js === "string" ? rawBody.js : existing.js,
    };

    const validated = validatePlaygroundProjectInput(mergedPayload);
    if (!validated.ok) {
      throw new HttpError(400, validated.reason);
    }

    const updated = await db.ictPlaygroundProject.update({
      where: { id: existing.id },
      data: {
        title: validated.data.title,
        html: validated.data.html,
        css: validated.data.css,
        js: validated.data.js,
      },
    });

    return NextResponse.json({ project: toProjectDTO(updated) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleUpdate(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return handleUpdate(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await requireIctLabApiActor(request);
    const { id } = await context.params;

    const existing = await db.ictPlaygroundProject.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new HttpError(404, "Project not found.");
    }
    if (!checkProjectOwnership(existing.userId, actor.userId)) {
      throw new HttpError(403, "You do not have permission to delete this project.");
    }

    await db.ictPlaygroundProject.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ deleted: true, id: existing.id });
  } catch (err) {
    return errorResponse(err);
  }
}

