import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePracticumActor } from "@/lib/practicum/guard";
import { HttpError, errorResponse } from "@/lib/practicum/http";
import { canDeleteSubmission, type SubmissionStatus } from "@/lib/practicum/rules";
import { requirePlacementAccess } from "@/lib/practicum/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/practicum/lesson-plans/[id]
 * Removes the lesson plan submission record (owner student only, while status is SUBMITTED).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requirePracticumActor(req, ["STUDENT"]);

    const submission = await db.practicumSubmission.findUnique({
      where: { id },
      select: {
        id: true,
        placementId: true,
        status: true,
      },
    });
    if (!submission) {
      throw new HttpError(404, "Lesson plan not found.");
    }

    await requirePlacementAccess(submission.placementId, actor, "student");

    if (submission.status === "APPROVED") {
      throw new HttpError(400, "Approved lesson plans cannot be deleted.");
    }
    if (!canDeleteSubmission(submission.status as SubmissionStatus)) {
      throw new HttpError(400, "Only submitted lesson plans awaiting review can be deleted.");
    }

    await db.$transaction(async (tx) => {
      const tableCheck = await tx.$queryRawUnsafe<Array<{ reg: string | null }>>(
        `SELECT to_regclass('public."PracticumLessonPlanFile"')::text AS reg`
      );
      if (tableCheck?.[0]?.reg) {
        const fileModel = (
          tx as unknown as {
            practicumLessonPlanFile?: {
              deleteMany: typeof db.practicumLessonPlanFile.deleteMany;
            };
          }
        ).practicumLessonPlanFile;
        if (fileModel) {
          await fileModel.deleteMany({ where: { lessonPlanId: submission.id } });
        } else {
          await tx.$executeRaw`DELETE FROM "PracticumLessonPlanFile" WHERE "lessonPlanId" = ${submission.id}`;
        }
      }
      await tx.practicumSubmission.delete({
        where: { id: submission.id },
        select: { id: true },
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse(err);
  }
}
