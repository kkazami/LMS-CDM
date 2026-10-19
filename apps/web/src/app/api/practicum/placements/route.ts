import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/admin-types";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse, isUniqueViolation, readJson } from "@/lib/practicum/http";
import { createPlacementSchema } from "@/lib/practicum/schemas";
import {
  getPlacementDTO,
  getStudentPlacements,
  getSupervisorPlacements,
  notifyStudentOfPlacement,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

/**
 * GET /api/practicum/placements
 * Students get their own placements; instructors get the placements they supervise,
 * each with real per-type counts.
 */
export async function GET(request: Request) {
  try {
    const actor = await requirePracticumActor(request, ["STUDENT", "INSTRUCTOR"]);
    const placements =
      actor.role === "STUDENT"
        ? await getStudentPlacements(actor.userId)
        : await getSupervisorPlacements(actor.userId);
    return NextResponse.json({ placements });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * POST /api/practicum/placements
 * Instructor only. The caller becomes the supervisor; the student must be an active ITE student.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePracticumActor(request, ["INSTRUCTOR"]);
    const input = createPlacementSchema.parse(await readJson(request));

    const student = await db.user.findUnique({
      where: { id: input.studentId },
      select: { id: true, role: true, instituteId: true, isActive: true },
    });
    if (
      !student ||
      !student.isActive ||
      student.instituteId !== actor.instituteId ||
      normalizeRole(student.role) !== "STUDENT"
    ) {
      throw new HttpError(400, "Choose an active ITE student.");
    }

    let created;
    try {
      created = await db.practicumPlacement.create({
        data: {
          studentId: student.id,
          supervisorId: actor.userId,
          schoolName: input.schoolName,
          subject: input.subject,
          gradeLevel: input.gradeLevel,
          schoolYear: input.schoolYear,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        select: { id: true },
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new HttpError(409, "This student already has a placement for that school year.");
      }
      throw err;
    }

    await notifyStudentOfPlacement({
      studentId: student.id,
      supervisorName: actor.name,
      schoolName: input.schoolName,
    });

    const placement = await getPlacementDTO(created.id);
    return NextResponse.json({ placement }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
