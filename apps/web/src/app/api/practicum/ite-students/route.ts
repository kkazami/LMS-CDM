import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { errorResponse } from "@/lib/practicum/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/practicum/ite-students?search=
 * Instructor only. Active students of the instructor's own (ITE) institute for the
 * "Add placement" picker. Returns id and name only: no email, phone or student number.
 */
export async function GET(request: Request) {
  try {
    const actor = await requirePracticumActor(request, ["INSTRUCTOR"]);
    const search = (new URL(request.url).searchParams.get("search") ?? "").trim().slice(0, 100);

    const students = await db.user.findMany({
      where: {
        instituteId: actor.instituteId,
        role: { equals: "STUDENT", mode: "insensitive" },
        isActive: true,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 20,
    });

    return NextResponse.json({ students });
  } catch (err) {
    return errorResponse(err);
  }
}
