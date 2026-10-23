import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveSubmissionSource } from "@/lib/practicum/blob";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse, readJson } from "@/lib/practicum/http";
import { resubmitSchema } from "@/lib/practicum/schemas";
import { statusAfterResubmit, type SubmissionStatus, type SubmissionType } from "@/lib/practicum/rules";
import {
  getSubmissionDTO,
  notifySupervisorOfSubmission,
  requirePlacementAccess,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/practicum/submissions/[id]
 * Resubmission: the placement's student only, and only while the submission is NEEDS_REVISION.
 * Takes a new file or link, bumps the version and returns the submission to SUBMITTED.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["STUDENT"]);

    const submission = await db.practicumSubmission.findUnique({
      where: { id },
      select: { id: true, placementId: true, type: true, title: true, status: true, version: true },
    });
    if (!submission) throw new HttpError(404, "Submission not found.");

    const { placement } = await requirePlacementAccess(submission.placementId, actor, "student");
    if (placement.status !== "ACTIVE") {
      throw new HttpError(409, "This placement is completed and no longer accepts submissions.");
    }

    const transition = statusAfterResubmit(submission.status as SubmissionStatus);
    if (!transition.ok) throw new HttpError(409, transition.reason);

    const input = resubmitSchema.parse(await readJson(request));
    const source = await resolveSubmissionSource({
      type: submission.type as SubmissionType,
      placementId: placement.id,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      videoLink: input.videoLink,
    });

    // Guarded by status and version so two concurrent resubmits cannot both succeed.
    const updated = await db.practicumSubmission.updateMany({
      where: { id, status: "NEEDS_REVISION", version: submission.version },
      data: {
        ...source,
        title: input.title,
        description: input.description === undefined ? undefined : input.description || null,
        status: transition.status,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new HttpError(409, "This submission was changed by someone else. Refresh and try again.");
    }

    await notifySupervisorOfSubmission({
      supervisorId: placement.supervisorId,
      placementId: placement.id,
      studentName: actor.name,
      title: input.title ?? submission.title,
      resubmitted: true,
    });

    return NextResponse.json({ submission: await getSubmissionDTO(id) });
  } catch (err) {
    return errorResponse(err);
  }
}
