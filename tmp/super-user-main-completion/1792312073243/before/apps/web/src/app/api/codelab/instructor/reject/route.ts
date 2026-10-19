import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

interface RejectSubmissionBody {
  submissionId: string;
  action: "reject" | "delete" | "restore";
  reason?: string;
  instituteCode: string;
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role.toUpperCase();
    if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Only instructors can reject or invalidate submissions." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as RejectSubmissionBody;
    const { submissionId, action, reason, instituteCode } = body;

    if (!submissionId) {
      return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
    }

    const submission = await db.activitySubmission.findUnique({
      where: { id: submissionId },
      include: {
        template: {
          select: { syllabusItemId: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    if (action === "delete") {
      await db.activitySubmission.delete({
        where: { id: submissionId },
      });

      // Notify student that their attempt was reset
      await createNotification({
        userId: submission.studentId,
        type: "REMINDER",
        title: "CodeLab Attempt Reset",
        message: "Your instructor reset a CodeLab submission attempt. You may now retake the challenge.",
        link: `/${instituteCode || "ics"}/activities/codelab`,
      });

      if (instituteCode) {
        revalidatePath(`/(dashboard)/${instituteCode}/activities/codelab/instructor`);
      }

      return NextResponse.json({
        success: true,
        action: "delete",
        message: "Attempt deleted. Student may retake the challenge.",
      });
    }

    if (action === "restore") {
      let stateObj: Record<string, unknown> = {};
      try {
        stateObj = JSON.parse(submission.stateCheck || "{}");
      } catch {
        stateObj = {};
      }

      const restoredScore = typeof stateObj.originalScore === "number" ? stateObj.originalScore : 100;
      delete stateObj.isRejected;
      delete stateObj.rejectionReason;
      delete stateObj.rejectedAt;
      delete stateObj.rejectedBy;

      await db.activitySubmission.update({
        where: { id: submissionId },
        data: {
          score: restoredScore,
          passed: restoredScore === 100,
          stateCheck: JSON.stringify(stateObj),
        },
      });

      if (submission.template?.syllabusItemId) {
        try {
          await db.studentSubmission.updateMany({
            where: {
              syllabusItemId: submission.template.syllabusItemId,
              studentId: submission.studentId,
            },
            data: {
              grade: restoredScore,
              status: "GRADED",
            },
          });
        } catch (err) {
          console.error("Gradebook update error on restore:", err);
        }
      }

      // Notify student that their attempt was restored
      await createNotification({
        userId: submission.studentId,
        type: "GRADE",
        title: "CodeLab Submission Restored",
        message: `Your CodeLab submission has been restored by your instructor (Score: ${restoredScore}%).`,
        link: `/${instituteCode || "ics"}/activities/codelab`,
      });

      if (instituteCode) {
        revalidatePath(`/(dashboard)/${instituteCode}/activities/codelab/instructor`);
      }

      return NextResponse.json({
        success: true,
        action: "restore",
        message: "Submission restored.",
      });
    }

    // Default action: "reject" / invalidate
    let stateObj: Record<string, unknown> = {};
    try {
      stateObj = JSON.parse(submission.stateCheck || "{}");
    } catch {
      stateObj = {};
    }

    stateObj.isRejected = true;
    stateObj.rejectionReason = reason || "Attempt invalidated by instructor.";
    stateObj.originalScore = submission.score;
    stateObj.rejectedAt = new Date().toISOString();
    stateObj.rejectedBy = session.user.id;

    await db.activitySubmission.update({
      where: { id: submissionId },
      data: {
        score: 0,
        passed: false,
        stateCheck: JSON.stringify(stateObj),
      },
    });

    // Reset student submission gradebook entry if exists
    if (submission.template?.syllabusItemId) {
      try {
        await db.studentSubmission.updateMany({
          where: {
            syllabusItemId: submission.template.syllabusItemId,
            studentId: submission.studentId,
          },
          data: {
            grade: 0,
            status: "RETURNED",
          },
        });
      } catch (err) {
        console.error("Gradebook update error on rejection:", err);
      }
    }

    // Notify student that their attempt was invalidated
    await createNotification({
      userId: submission.studentId,
      type: "ALERT",
      title: "CodeLab Submission Invalidated",
      message: `Your CodeLab attempt was invalidated by your instructor: ${reason || "Academic integrity or requirement check failed."}`,
      link: `/${instituteCode || "ics"}/activities/codelab`,
    });

    if (instituteCode) {
      revalidatePath(`/(dashboard)/${instituteCode}/activities/codelab/instructor`);
    }

    return NextResponse.json({
      success: true,
      action: "reject",
      message: "Attempt invalidated and score set to 0%.",
    });
  } catch (error) {
    console.error("REJECT_SUBMISSION_ERROR", error);
    return NextResponse.json({ error: "Failed to process rejection" }, { status: 500 });
  }
}
