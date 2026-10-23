import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse, readJson } from "@/lib/practicum/http";
import { feedbackSchema } from "@/lib/practicum/schemas";
import { statusAfterFeedback, type SubmissionStatus } from "@/lib/practicum/rules";
import {
  getSubmissionDTO,
  notifyStudentOfFeedback,
  requirePlacementAccess,
} from "@/lib/practicum/service";

export const dynamic = "force-dynamic";

/**
 * POST /api/practicum/submissions/[id]/feedback
 * Supervisor of that placement only. APPROVED / NEEDS_REVISION decisions move the submission's
 * status; APPROVED is final. The student is notified.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(request, ["INSTRUCTOR"]);

    const submission = await db.practicumSubmission.findUnique({
      where: { id },
      select: { id: true, placementId: true, title: true, status: true },
    });
    if (!submission) throw new HttpError(404, "Submission not found.");

    const { placement } = await requirePlacementAccess(submission.placementId, actor, "supervisor");

    const input = feedbackSchema.parse(await readJson(request));

    const current = submission.status as SubmissionStatus;
    const transition = statusAfterFeedback(current, input.decision);
    if (!transition.ok) throw new HttpError(409, transition.reason);

    await db.$transaction(async (tx) => {
      // The status guard also stops a feedback entry racing an approval or a resubmission.
      const guarded = await tx.practicumSubmission.updateMany({
        where: { id, status: current },
        data: { status: transition.status },
      });
      if (guarded.count !== 1) {
        throw new HttpError(409, "This submission was changed by someone else. Refresh and try again.");
      }

      await tx.practicumFeedback.create({
        data: {
          submissionId: id,
          authorId: actor.userId,
          comment: input.comment,
          decision: input.decision,
          score: input.score ?? null,
        },
      });
    });

    await notifyStudentOfFeedback({
      studentId: placement.studentId,
      supervisorName: actor.name,
      title: submission.title,
      decision: input.decision,
    });

    return NextResponse.json({ submission: await getSubmissionDTO(id) }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
