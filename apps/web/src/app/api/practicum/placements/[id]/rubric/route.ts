import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildFileHeaders } from "@/lib/ite/media-preview";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse } from "@/lib/practicum/http";
import {
  getPlacementDTO,
  prepareRubricUpload,
  requirePlacementRubricManageAccess,
  requirePlacementRubricViewAccess,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/practicum/placements/[id]/rubric
 * Streams the placement's rubric file.
 * Authorized for: the instructor who owns the placement, ITE admins, and the assigned student teacher.
 * Everyone else receives 403.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["STUDENT", "INSTRUCTOR", "ADMIN"]);
    const placement = await requirePlacementRubricViewAccess(id, actor);

    if (!placement.rubricStorageKey || !placement.rubricFileName) {
      throw new HttpError(404, "No rubric file is attached to this placement.");
    }

    const asset = await db.privateAsset.findUnique({
      where: { id: placement.rubricStorageKey },
    });
    if (!asset) {
      throw new HttpError(404, "Rubric file not found.");
    }

    const mime = placement.rubricMimeType || asset.mimeType;
    const name = placement.rubricFileName || asset.fileName;
    const bytes = Buffer.from(asset.content);
    const headers = buildFileHeaders({ mime, name, length: bytes.byteLength }, false);

    return new Response(new Uint8Array(bytes), { headers });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * PUT /api/practicum/placements/[id]/rubric
 * Uploads or replaces the rubric file for a placement (owning ITE instructor or ITE admin only).
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["INSTRUCTOR", "ADMIN"]);
    const placement = await requirePlacementRubricManageAccess(id, actor);

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      throw new HttpError(400, "Expected multipart/form-data request.");
    }

    const rawFile = formData.get("rubric") ?? formData.get("file");
    if (!(rawFile instanceof File)) {
      throw new HttpError(400, "Choose a rubric file to upload.");
    }

    const prepared = await prepareRubricUpload(rawFile);

    await db.$transaction(async (tx) => {
      if (placement.rubricStorageKey) {
        await tx.privateAsset.deleteMany({ where: { id: placement.rubricStorageKey } });
      }

      await tx.privateAsset.create({
        data: {
          id: prepared.assetId,
          ownerId: actor.userId,
          instituteId: actor.instituteId,
          fileName: prepared.fileName,
          mimeType: prepared.mimeType,
          size: prepared.fileSize,
          content: prepared.bytes,
          scanStatus: "UNSCANNED",
          sha256: prepared.sha256,
        },
      });

      await tx.practicumPlacement.update({
        where: { id },
        data: {
          rubricStorageKey: prepared.assetId,
          rubricFileName: prepared.fileName,
          rubricMimeType: prepared.mimeType,
          rubricFileSize: prepared.fileSize,
          rubricUploadedAt: new Date(),
          rubricUploadedById: actor.userId,
        },
      });
    });

    return NextResponse.json({ placement: await getPlacementDTO(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

export const POST = PUT;

/**
 * DELETE /api/practicum/placements/[id]/rubric
 * Removes the rubric file from a placement and deletes the stored file (owning ITE instructor or ITE admin only).
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["INSTRUCTOR", "ADMIN"]);
    const placement = await requirePlacementRubricManageAccess(id, actor);

    await db.$transaction(async (tx) => {
      if (placement.rubricStorageKey) {
        await tx.privateAsset.deleteMany({ where: { id: placement.rubricStorageKey } });
      }

      await tx.practicumPlacement.update({
        where: { id },
        data: {
          rubricStorageKey: null,
          rubricFileName: null,
          rubricMimeType: null,
          rubricFileSize: null,
          rubricUploadedAt: null,
          rubricUploadedById: null,
        },
      });
    });

    return NextResponse.json({ placement: await getPlacementDTO(id) });
  } catch (err) {
    return errorResponse(err);
  }
}

