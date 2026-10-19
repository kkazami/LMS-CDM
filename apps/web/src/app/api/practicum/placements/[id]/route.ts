import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse, readJson } from "@/lib/practicum/http";
import { updatePlacementSchema } from "@/lib/practicum/schemas";
import { getPlacementDTO, requirePlacementAccess } from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/practicum/placements/[id]
 * Supervisor of that placement only: mark COMPLETED (or reopen) and edit its details.
 * The student and school year cannot be changed.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["INSTRUCTOR"]);
    await requirePlacementAccess(id, actor, "supervisor");

    const input = updatePlacementSchema.parse(await readJson(request));

    const existing = await db.practicumPlacement.findUnique({
      where: { id },
      select: { startDate: true, endDate: true },
    });
    if (!existing) throw new HttpError(404, "Placement not found.");

    const start = input.startDate ?? existing.startDate;
    const end = input.endDate ?? existing.endDate;
    if (end.getTime() < start.getTime()) {
      throw new HttpError(400, "End date must be on or after the start date.");
    }

    await db.practicumPlacement.update({
      where: { id },
      data: {
        status: input.status,
        schoolName: input.schoolName,
        subject: input.subject,
        gradeLevel: input.gradeLevel,
        startDate: input.startDate,
        endDate: input.endDate,
      },
    });

    return NextResponse.json({ placement: await getPlacementDTO(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
