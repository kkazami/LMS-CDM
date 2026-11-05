import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, errorResponse, readJson } from "@/lib/practicum/http";
import { requireIctLabApiActor } from "@/lib/ict-lab/guard";
import {
  checkProjectCountLimit,
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

export async function GET(request: Request) {
  try {
    const actor = await requireIctLabApiActor(request);
    const projects = await db.ictPlaygroundProject.findMany({
      where: { userId: actor.userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      projects: projects.map(toProjectDTO),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireIctLabApiActor(request);
    const body = await readJson(request);

    const validated = validatePlaygroundProjectInput(body);
    if (!validated.ok) {
      throw new HttpError(400, validated.reason);
    }

    const currentCount = await db.ictPlaygroundProject.count({
      where: { userId: actor.userId },
    });
    const countCheck = checkProjectCountLimit(currentCount);
    if (!countCheck.ok) {
      throw new HttpError(400, countCheck.reason);
    }

    const created = await db.ictPlaygroundProject.create({
      data: {
        userId: actor.userId,
        title: validated.data.title,
        html: validated.data.html,
        css: validated.data.css,
        js: validated.data.js,
      },
    });

    return NextResponse.json(
      { project: toProjectDTO(created) },
      { status: 201 }
    );
  } catch (err) {
    return errorResponse(err);
  }
}

