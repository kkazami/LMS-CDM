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
  prepareRubricUpload,
  type PreparedRubricUpload,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/practicum/placements
 * Students get their own placements; instructors get the placements they supervise,
 * each with real per-type counts.
 */
export async function GET(request: Request) {
  try {
    const actor = await requirePracticumActor(request, ["STUDENT", "INSTRUCTOR", "ADMIN"]);
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
 * Instructor/admin only. Accepts JSON or multipart/form-data (with optional `rubric` File).
 * When a rubric file is provided, both the PrivateAsset and PracticumPlacement are created
 * inside a single database transaction so no orphaned file is ever left if placement save fails.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePracticumActor(request, ["INSTRUCTOR", "ADMIN"]);

    const contentType = request.headers.get("content-type") ?? "";
    let rawInput: Record<string, unknown>;
    let rubricFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        throw new HttpError(400, "Expected multipart/form-data request.");
      }
      rawInput = {
        studentId: String(formData.get("studentId") ?? ""),
        schoolName: String(formData.get("schoolName") ?? ""),
        subject: String(formData.get("subject") ?? ""),
        gradeLevel: String(formData.get("gradeLevel") ?? ""),
        schoolYear: String(formData.get("schoolYear") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
      };
      const fileEntry = formData.get("rubric") ?? formData.get("file");
      if (fileEntry instanceof File && (fileEntry.name.trim().length > 0 || fileEntry.size > 0)) {
        rubricFile = fileEntry;
      }
    } else {
      rawInput = (await readJson(request)) as Record<string, unknown>;
    }

    const input = createPlacementSchema.parse(rawInput);

    let preparedRubric: PreparedRubricUpload | null = null;
    if (rubricFile) {
      preparedRubric = await prepareRubricUpload(rubricFile);
    }

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

    let created: { id: string };
    try {
      created = await db.$transaction(async (tx) => {
        if (preparedRubric) {
          await tx.privateAsset.create({
            data: {
              id: preparedRubric.assetId,
              ownerId: actor.userId,
              instituteId: actor.instituteId,
              fileName: preparedRubric.fileName,
              mimeType: preparedRubric.mimeType,
              size: preparedRubric.fileSize,
              content: preparedRubric.bytes,
              scanStatus: "UNSCANNED",
              sha256: preparedRubric.sha256,
            },
          });
        }

        return tx.practicumPlacement.create({
          data: {
            studentId: student.id,
            supervisorId: actor.userId,
            schoolName: input.schoolName,
            subject: input.subject,
            gradeLevel: input.gradeLevel,
            schoolYear: input.schoolYear,
            startDate: input.startDate,
            endDate: input.endDate,
            ...(preparedRubric
              ? {
                  rubricStorageKey: preparedRubric.assetId,
                  rubricFileName: preparedRubric.fileName,
                  rubricMimeType: preparedRubric.mimeType,
                  rubricFileSize: preparedRubric.fileSize,
                  rubricUploadedAt: new Date(),
                  rubricUploadedById: actor.userId,
                }
              : {}),
          },
          select: { id: true },
        });
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
