import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveSubmissionSource, type SubmissionSource } from "@/lib/practicum/blob";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse, isUniqueViolation } from "@/lib/practicum/http";
import {
  SUBMISSION_TYPES,
  statusAfterResubmit,
  type SubmissionStatus,
  type SubmissionType,
} from "@/lib/practicum/rules";
import {
  getSubmissionDTO,
  notifySupervisorOfSubmission,
  requirePlacementAccess,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

interface SchemaCapabilities {
  hasFileTable: boolean;
  hasIdempotencyColumn: boolean;
}

async function detectSchemaCapabilities(tx: {
  $queryRawUnsafe: <T = unknown>(query: string) => Promise<T>;
}): Promise<SchemaCapabilities> {
  try {
    const rows = await tx.$queryRawUnsafe<
      Array<{ file_table: string | null; has_idem_col: boolean }>
    >(`
      SELECT
        to_regclass('public."PracticumLessonPlanFile"')::text AS file_table,
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'PracticumSubmission'
            AND column_name = 'idempotencyKey'
        ) AS has_idem_col
    `);
    const first = rows?.[0];
    return {
      hasFileTable: Boolean(first?.file_table),
      hasIdempotencyColumn: Boolean(first?.has_idem_col),
    };
  } catch {
    return { hasFileTable: false, hasIdempotencyColumn: false };
  }
}

function buildDeterministicSubmissionId(placementId: string, idempotencyKey: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(`${placementId}:${idempotencyKey}`)
    .digest("hex")
    .slice(0, 24);
  return `lp_${digest}`;
}

/**
 * POST /api/practicum/lesson-plans
 * Accepts multipart/form-data (or JSON) with `title`, `description` (optional),
 * optional Vercel Blob `fileUrl` + `fileName`, and `idempotencyKey` (optional).
 * Requires an authenticated ITE student session.
 */
export async function POST(request: Request) {
  let targetSubmissionId = "";

  try {
    const actor = await requirePracticumActor(request, ["STUDENT"]);

    let rawTitle = "";
    let rawDescription = "";
    let rawType: SubmissionType = "LESSON_PLAN";
    let rawSubmissionId = "";
    let rawPlacementId = "";
    let rawIdempotencyKey = "";
    let rawFileUrl = "";
    let rawFileName = "";
    let hasRawFileUpload = false;

    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      rawTitle = String(body.title ?? "").trim();
      rawDescription = String(body.description ?? "").trim();
      rawType = String(body.type ?? "LESSON_PLAN").trim() as SubmissionType;
      rawSubmissionId = String(body.submissionId ?? "").trim();
      rawPlacementId = String(body.placementId ?? "").trim();
      rawIdempotencyKey = String(
        body.idempotencyKey ?? request.headers.get("x-idempotency-key") ?? ""
      )
        .trim()
        .slice(0, 128);
      rawFileUrl = String(body.fileUrl ?? "").trim();
      rawFileName = String(body.fileName ?? "").trim();
    } else {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        throw new HttpError(400, "Expected multipart/form-data request.");
      }
      rawTitle = String(formData.get("title") ?? "").trim();
      rawDescription = String(formData.get("description") ?? "").trim();
      rawType = String(formData.get("type") ?? "LESSON_PLAN").trim() as SubmissionType;
      rawSubmissionId = String(formData.get("submissionId") ?? "").trim();
      rawPlacementId = String(formData.get("placementId") ?? "").trim();
      rawIdempotencyKey = String(
        formData.get("idempotencyKey") ?? request.headers.get("x-idempotency-key") ?? ""
      )
        .trim()
        .slice(0, 128);
      rawFileUrl = String(formData.get("fileUrl") ?? "").trim();
      rawFileName = String(formData.get("fileName") ?? "").trim();
      const fileEntry = formData.get("file");
      hasRawFileUpload =
        fileEntry instanceof File && (fileEntry.size > 0 || fileEntry.name.trim().length > 0);
    }

    if (!rawTitle) {
      throw new HttpError(400, "Title is required.");
    }
    if (rawTitle.length > 200) {
      throw new HttpError(400, "Title must be at most 200 characters.");
    }
    if (rawDescription.length > 4000) {
      throw new HttpError(400, "Description must be at most 4000 characters.");
    }

    const submissionType: SubmissionType = (SUBMISSION_TYPES as readonly string[]).includes(rawType)
      ? rawType
      : "LESSON_PLAN";

    let placementId = rawPlacementId;
    let existingSubmission: {
      id: string;
      placementId: string;
      type: string;
      title: string;
      status: string;
      version: number;
    } | null = null;

    if (rawSubmissionId) {
      existingSubmission = await db.practicumSubmission.findUnique({
        where: { id: rawSubmissionId },
        select: { id: true, placementId: true, type: true, title: true, status: true, version: true },
      });
      if (!existingSubmission) {
        throw new HttpError(404, "Submission not found.");
      }
      placementId = existingSubmission.placementId;
    } else if (!placementId) {
      const activePlacement = await db.practicumPlacement.findFirst({
        where: { studentId: actor.userId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (!activePlacement) {
        throw new HttpError(404, "Active practicum placement not found.");
      }
      placementId = activePlacement.id;
    }

    const { placement } = await requirePlacementAccess(placementId, actor, "student");
    if (placement.status !== "ACTIVE") {
      throw new HttpError(409, "This placement is completed and no longer accepts submissions.");
    }

    if (existingSubmission) {
      const transition = statusAfterResubmit(existingSubmission.status as SubmissionStatus);
      if (!transition.ok) {
        throw new HttpError(409, transition.reason);
      }
      targetSubmissionId = existingSubmission.id;
    } else if (rawIdempotencyKey) {
      targetSubmissionId = buildDeterministicSubmissionId(placement.id, rawIdempotencyKey);
      const alreadyCreated = await getSubmissionDTO(targetSubmissionId);
      if (alreadyCreated && alreadyCreated.placementId === placement.id) {
        return NextResponse.json(
          { success: true, lessonPlan: alreadyCreated, submission: alreadyCreated },
          { status: 200 }
        );
      }
    } else {
      targetSubmissionId = `lp_${crypto.randomUUID().replace(/-/g, "")}`;
    }

    let source: SubmissionSource = {
      fileUrl: null,
      fileName: null,
      fileType: null,
      fileSize: null,
      videoLink: null,
    };

    if (rawFileUrl || rawFileName || hasRawFileUpload) {
      source = await resolveSubmissionSource({
        type: submissionType,
        placementId: placement.id,
        fileUrl: rawFileUrl || undefined,
        fileName: rawFileName || undefined,
      });
    } else if (existingSubmission || submissionType !== "LESSON_PLAN") {
      throw new HttpError(400, "Choose a file to upload.");
    }

    try {
      await db.$transaction(async (tx) => {
        const caps = await detectSchemaCapabilities(tx);
        const fileModel = (
          tx as unknown as {
            practicumLessonPlanFile?: {
              upsert: typeof db.practicumLessonPlanFile.upsert;
              create: typeof db.practicumLessonPlanFile.create;
            };
          }
        ).practicumLessonPlanFile;

        if (existingSubmission) {
          const updated = await tx.practicumSubmission.updateMany({
            where: {
              id: existingSubmission.id,
              status: "NEEDS_REVISION",
              version: existingSubmission.version,
            },
            data: {
              title: rawTitle,
              description: rawDescription || null,
              ...(source.fileUrl
                ? {
                    fileUrl: source.fileUrl,
                    fileName: source.fileName,
                    fileType: source.fileType,
                    fileSize: source.fileSize === null ? null : Number(source.fileSize),
                    videoLink: null,
                  }
                : {}),
              status: "SUBMITTED",
              version: { increment: 1 },
            },
          });

          if (updated.count !== 1) {
            throw new HttpError(409, "This submission was changed by someone else. Refresh and try again.");
          }

          if (source.fileUrl && source.fileName && source.fileType && source.fileSize !== null && caps.hasFileTable) {
            if (fileModel) {
              await fileModel.upsert({
                where: { lessonPlanId: existingSubmission.id },
                update: {
                  storageKey: source.fileUrl,
                  originalName: source.fileName,
                  mimeType: source.fileType,
                  size: Number(source.fileSize),
                  uploadedById: actor.userId,
                },
                create: {
                  storageKey: source.fileUrl,
                  originalName: source.fileName,
                  mimeType: source.fileType,
                  size: Number(source.fileSize),
                  uploadedById: actor.userId,
                  lessonPlanId: existingSubmission.id,
                },
              });
            } else {
              await tx.$executeRaw`
                INSERT INTO "PracticumLessonPlanFile" ("id", "storageKey", "originalName", "mimeType", "size", "uploadedById", "lessonPlanId", "createdAt")
                VALUES (${crypto.randomUUID()}, ${source.fileUrl}, ${source.fileName}, ${source.fileType}, ${Number(source.fileSize)}, ${actor.userId}, ${existingSubmission.id}, NOW())
                ON CONFLICT ("lessonPlanId") DO UPDATE SET
                  "storageKey" = EXCLUDED."storageKey",
                  "originalName" = EXCLUDED."originalName",
                  "mimeType" = EXCLUDED."mimeType",
                  "size" = EXCLUDED."size",
                  "uploadedById" = EXCLUDED."uploadedById"
              `;
            }
          }
          return;
        }

        if (rawIdempotencyKey && caps.hasIdempotencyColumn) {
          const existingByIdem = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT "id" FROM "PracticumSubmission"
            WHERE "placementId" = ${placement.id} AND "idempotencyKey" = ${rawIdempotencyKey}
            LIMIT 1
          `;
          if (existingByIdem.length > 0) {
            targetSubmissionId = existingByIdem[0].id;
            return;
          }
        }

        await tx.practicumSubmission.create({
          data: {
            id: targetSubmissionId,
            placementId: placement.id,
            type: submissionType,
            title: rawTitle,
            description: rawDescription || null,
            fileUrl: source.fileUrl,
            fileName: source.fileName,
            fileType: source.fileType,
            fileSize: source.fileSize === null ? null : Number(source.fileSize),
            videoLink: null,
          },
          select: { id: true },
        });

        if (rawIdempotencyKey && caps.hasIdempotencyColumn) {
          await tx.$executeRaw`
            UPDATE "PracticumSubmission"
            SET "idempotencyKey" = ${rawIdempotencyKey}
            WHERE "id" = ${targetSubmissionId}
          `;
        }

        if (source.fileUrl && source.fileName && source.fileType && source.fileSize !== null && caps.hasFileTable) {
          if (fileModel) {
            await fileModel.create({
              data: {
                storageKey: source.fileUrl,
                originalName: source.fileName,
                mimeType: source.fileType,
                size: Number(source.fileSize),
                uploadedById: actor.userId,
                lessonPlanId: targetSubmissionId,
              },
            });
          } else {
            await tx.$executeRaw`
              INSERT INTO "PracticumLessonPlanFile" ("id", "storageKey", "originalName", "mimeType", "size", "uploadedById", "lessonPlanId", "createdAt")
              VALUES (${crypto.randomUUID()}, ${source.fileUrl}, ${source.fileName}, ${source.fileType}, ${Number(source.fileSize)}, ${actor.userId}, ${targetSubmissionId}, NOW())
            `;
          }
        }
      });
    } catch (txErr) {
      if (!existingSubmission && rawIdempotencyKey && isUniqueViolation(txErr)) {
        const existingDto = await getSubmissionDTO(targetSubmissionId);
        if (existingDto) {
          return NextResponse.json(
            { success: true, lessonPlan: existingDto, submission: existingDto },
            { status: 200 }
          );
        }
      }
      throw txErr;
    }

    // Non-critical side effect: supervisor notification must never turn a saved upload into a 500
    try {
      await notifySupervisorOfSubmission({
        supervisorId: placement.supervisorId,
        placementId: placement.id,
        studentName: actor.name,
        title: rawTitle,
        resubmitted: Boolean(existingSubmission),
      });
    } catch (notifyErr) {
      console.error("[practicum] notifySupervisorOfSubmission error:", notifyErr);
    }

    const lessonPlan = await getSubmissionDTO(targetSubmissionId);
    if (!lessonPlan) {
      throw new HttpError(500, "Could not load the saved lesson plan. Please refresh the page.");
    }

    return NextResponse.json(
      {
        success: true,
        lessonPlan,
        submission: lessonPlan,
      },
      { status: existingSubmission ? 200 : 201 }
    );
  } catch (err) {
    if (err instanceof HttpError) {
      return errorResponse(err);
    }
    console.error("[PRACTICUM_LESSON_PLAN_POST_ERROR]", err);
    return NextResponse.json(
      {
        error: "Could not save the lesson plan. Please try again.",
        message: "Could not save the lesson plan. Please try again.",
      },
      { status: 500 }
    );
  }
}
