import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

interface SyncParams {
  formId: string;
  userId: string;
  attemptId: string;
  earnedScore: number;
  totalPoints: number;
}

export async function syncAttemptScoreToGradebook({
  formId,
  userId,
  attemptId,
  earnedScore,
  totalPoints,
}: SyncParams) {
  try {
    const form = await db.form.findUnique({
      where: { id: formId },
      include: {
        syllabusItem: {
          select: {
            id: true,
            title: true,
            courseId: true,
            maxPoints: true,
          },
        },
      },
    });

    if (!form || !form.syllabusItem) {
      console.warn(`[GradebookSync] Form or SyllabusItem not found for formId=${formId}`);
      return;
    }

    // Determine student score based on scoreToKeep policy
    const maxPoints = form.syllabusItem.maxPoints ?? totalPoints;
    const normalized = (score: number, possible: number) => possible > 0 ? Math.max(0, Math.min(maxPoints, score / possible * maxPoints)) : 0;
    let finalRawScore = normalized(earnedScore, totalPoints);

    if (form.maxAttempts > 1) {
      const allSubmittedAttempts = await db.formAttempt.findMany({
        where: {
          formId,
          userId,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        select: { rawScore: true, totalPoints: true },
        orderBy: { attemptNumber: "asc" },
      });

      const scores = allSubmittedAttempts
        .filter(a => a.rawScore !== null && a.totalPoints !== null)
        .map(a => normalized(a.rawScore!, a.totalPoints!));

      if (scores.length > 0) {
        if (form.scoreToKeep === "HIGHEST") {
          finalRawScore = Math.max(...scores);
        } else if (form.scoreToKeep === "LATEST") {
          finalRawScore = scores[scores.length - 1];
        } else if (form.scoreToKeep === "AVERAGE") {
          finalRawScore = scores.reduce((sum, val) => sum + val, 0) / scores.length;
        }
      }
    }

    // Convert to percentage (0 - 100) or normalize to syllabusItem.maxPoints
    const finalGrade = Math.round(finalRawScore * 100) / 100;

    // Upsert into StudentSubmission
    const submission = await db.studentSubmission.upsert({
      where: {
        syllabusItemId_studentId: {
          syllabusItemId: form.syllabusItemId,
          studentId: userId,
        },
      },
      create: {
        syllabusItemId: form.syllabusItemId,
        studentId: userId,
        status: "SUBMITTED",
        grade: finalGrade,
        submittedAt: new Date(),
        isReturned: form.showScoreAfter,
      },
      update: {
        grade: finalGrade,
        status: "SUBMITTED",
        submittedAt: new Date(),
        isReturned: form.showScoreAfter,
      },
    });

    // Mark attempt as synced
    await db.formAttempt.update({
      where: { id: attemptId },
      data: {
        syncedToGradebook: true,
        syncedAt: new Date(),
      },
    });

    // Notify student if score visibility is enabled
    if (form.showScoreAfter) {
      await createNotification({
        userId,
        type: "GRADE",
        title: `Grade Posted: ${form.title}`,
        message: `Your score for ${form.title} has been recorded: ${finalGrade}/${maxPoints}.`,
        link: `/${form.courseId}/classwork/${form.syllabusItemId}`,
      });
    }

    return submission;
  } catch (error) {
    console.error("[GradebookSync Error]", error);
  }
}
