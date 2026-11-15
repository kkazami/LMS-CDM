import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePracticumActor } from "@/lib/practicum/guard";
import {
  HttpError,
  PRACTICUM_RUBRIC_TRANSACTION_OPTIONS,
  errorResponse,
  readJson,
} from "@/lib/practicum/http";
import { updatePlacementSchema } from "@/lib/practicum/schemas";
import {
  getPlacementDTO,
  prepareRubricUpload,
  requirePlacementRubricManageAccess,
  type PreparedRubricUpload,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * PATCH /api/practicum/placements/[id]
 * Owning supervisor or ITE admin: mark COMPLETED (or reopen), edit details,
 * and optionally upload/replace or remove the rubric file.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["INSTRUCTOR", "ADMIN"]);
    const ownership = await requirePlacementRubricManageAccess(id, actor);

    const contentType = request.headers.get("content-type") ?? "";
    let rawBody: Record<string, unknown> = {};
    let rubricFile: File | null = null;
    let removeRubric = false;

    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        throw new HttpError(400, "Expected multipart/form-data request.");
      }
      for (const field of ["status", "schoolName", "subject", "gradeLevel", "startDate", "endDate"] as const) {
        const val = formData.get(field);
        if (typeof val === "string" && val.trim().length > 0) {
          rawBody[field] = val;
        }
      }
      const removeFlag = formData.get("removeRubric");
      removeRubric = removeFlag === "true" || removeFlag === "1";
      const fileEntry = formData.get("rubric") ?? formData.get("file");
      if (fileEntry instanceof File && (fileEntry.name.trim().length > 0 || fileEntry.size > 0)) {
        rubricFile = fileEntry;
      }
    } else {
      rawBody = (await readJson(request)) as Record<string, unknown>;
      removeRubric = rawBody.removeRubric === true;
      delete rawBody.removeRubric;
    }

    const hasFieldUpdates = Object.values(rawBody).some((x) => x !== undefined);
    const input = hasFieldUpdates ? updatePlacementSchema.parse(rawBody) : {};

    if (!hasFieldUpdates && !rubricFile && !removeRubric) {
      throw new HttpError(400, "Nothing to update.");
    }

    let preparedRubric: PreparedRubricUpload | null = null;
    if (rubricFile) {
      preparedRubric = await prepareRubricUpload(rubricFile);
    }

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

    await db.$transaction(async (tx) => {
      if ((preparedRubric || removeRubric) && ownership.rubricStorageKey) {
        await tx.privateAsset.deleteMany({ where: { id: ownership.rubricStorageKey } });
      }

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

      await tx.practicumPlacement.update({
        where: { id },
        data: {
          status: input.status,
          schoolName: input.schoolName,
          subject: input.subject,
          gradeLevel: input.gradeLevel,
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
            : removeRubric
              ? {
                  rubricStorageKey: null,
                  rubricFileName: null,
                  rubricMimeType: null,
                  rubricFileSize: null,
                  rubricUploadedAt: null,
                  rubricUploadedById: null,
                }
              : {}),
        },
      });
    }, PRACTICUM_RUBRIC_TRANSACTION_OPTIONS);

    return NextResponse.json({ placement: await getPlacementDTO(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
