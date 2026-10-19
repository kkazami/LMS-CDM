import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveSubmissionSource } from "@/lib/practicum/blob";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse, readJson } from "@/lib/practicum/http";
import { createSubmissionSchema } from "@/lib/practicum/schemas";
import {
  getSubmissionDTO,
  notifySupervisorOfSubmission,
  requirePlacementAccess,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/practicum/submissions
 * The placement's student only, while the placement is ACTIVE. The file was already uploaded
 * straight to Blob by the browser; this route only records it after re-verifying the URL.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePracticumActor(request, ["STUDENT"]);
    const input = createSubmissionSchema.parse(await readJson(request));

    const { placement } = await requirePlacementAccess(input.placementId, actor, "student");
    if (placement.status !== "ACTIVE") {
      throw new HttpError(409, "This placement is completed and no longer accepts submissions.");
    }

    const source = await resolveSubmissionSource({
      type: input.type,
      placementId: placement.id,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      videoLink: input.videoLink,
    });

    const created = await db.practicumSubmission.create({
      data: {
        placementId: placement.id,
        type: input.type,
        title: input.title,
        description: input.description || null,
        ...source,
      },
      select: { id: true },
    });

    await notifySupervisorOfSubmission({
      supervisorId: placement.supervisorId,
      placementId: placement.id,
      studentName: actor.name,
      title: input.title,
      resubmitted: false,
    });

    return NextResponse.json({ submission: await getSubmissionDTO(created.id) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
