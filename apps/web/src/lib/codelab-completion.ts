import { academicProvenance } from '@/lib/labs/readiness';
import { assertOrdinaryClasswork, markAcademicWorkStarted } from '@/lib/academic-task';
import { lockAcademicRecord } from '@/lib/academic-records';
import { db } from "@/lib/db";
import { getProblemById } from "@/features/interactive-activities/codelab/problems";
import type { ActivitySubmissionPayload } from "@/features/interactive-activities/shared/schemas";
import { grantExp } from "@/lib/gamification/grant-exp";
import { EXP_VALUES } from "@/lib/gamification/exp-engine";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";
import { processGamificationEvent } from "@/features/interactive-activities/gamification/engine";
import type { Prisma } from "@prisma/client";

export function getCodeLabReward(studentId: string, templateId: string, client: Pick<Prisma.TransactionClient, "expTransaction"> = db) {
  return client.expTransaction.findFirst({ where: { userId: studentId, OR:
    ["pass", "perfect", "complete"].map(kind => ({ reason: { contains: `[KEY:codelab_${kind}_${templateId}]` } })) }, select: { id: true } });
}

export function getCodeLabCompletion(studentId: string, templateId: string) {
  return db.activitySubmission.findFirst({
    where: { studentId, templateId, activityType: "codelab", score: { gte: 60 } },
    orderBy: { submittedAt: "asc" },
  });
}

export class CodeLabCompletionError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** The saved solution and its only completion reward commit together. */
export async function saveCodeLabCompletion(payload: ActivitySubmissionPayload, instituteId: string) {
  const result = await db.$transaction(async tx => {
    const originalTemplate = await tx.activityTemplate.findUnique({ where: { id: payload.assignmentId }, select: { syllabusItemId: true } });
    if (originalTemplate?.syllabusItemId) {
      await assertOrdinaryClasswork(tx, originalTemplate.syllabusItemId);
      await lockAcademicRecord(tx, payload.studentId, originalTemplate.syllabusItemId);
    }
    // Serialize different tabs, retries and both submission endpoints for this level.
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${JSON.stringify([payload.studentId, payload.assignmentId])}, 0))`;
    const existing = await tx.activitySubmission.findFirst({
      where: { studentId: payload.studentId, templateId: payload.assignmentId, activityType: "codelab", score: { gte: 60 } },
      orderBy: { submittedAt: "asc" },
    });
    if (existing) return { submission: existing, alreadyCompleted: true, grantedExp: 0, leveledUp: false, newLevel: 1, courseId: "" };
    // Older evaluations sometimes issued EXP but lost their background submission.
    if (await getCodeLabReward(payload.studentId, payload.assignmentId, tx)) {
      throw new CodeLabCompletionError(409, "This level was already completed. Use Run Tests for practice.");
    }

    const problem = getProblemById(payload.assignmentId);
    let template = await tx.activityTemplate.findUnique({ where: { id: payload.assignmentId }, include: { course: true } });
    if (!template && problem) {
      const course = await tx.course.findFirst({
        where: { instituteId, isArchived: false, OR: [
          { instructorId: payload.studentId },
          { enrollments: { some: { studentId: payload.studentId, status: "APPROVED" } } },
        ] },
        orderBy: { id: "asc" },
      });
      if (!course) throw new CodeLabCompletionError(403, "An active enrolled or taught course is required to save CodeLab progress.");
      template = await tx.activityTemplate.upsert({
        where: { id: problem.id }, update: {},
        create: { id: problem.id, title: problem.title, activityType: "codelab", courseId: course.id,
          createdBy: payload.studentId, difficulty: problem.stage === "basics" ? 1 : problem.stage === "building-up" ? 2 : 3,
          variables: JSON.stringify(problem.variables), hiddenTestCases: JSON.stringify(problem.testCases.filter(tc => tc.isHidden)) },
        include: { course: true },
      });
    }
    if (!template || template.activityType !== "codelab") throw new CodeLabCompletionError(404, "CodeLab template not found.");
    if (template.syllabusItemId !== (originalTemplate?.syllabusItemId ?? null)) throw new CodeLabCompletionError(409, 'Activity linkage changed. Retry the submission.');
    if (template.syllabusItemId) await markAcademicWorkStarted(tx, template.syllabusItemId, payload.studentId);
    // Static tracks are shared problem definitions; course-specific templates retain course scope.
    if (!problem && (template.course.instituteId !== instituteId || template.course.isArchived ||
        (template.course.instructorId !== payload.studentId && !await tx.enrollment.findFirst({
          where: { courseId: template.courseId, studentId: payload.studentId, status: "APPROVED" },
        })))) throw new CodeLabCompletionError(403, "Forbidden course.");

    const passed = payload.score >= 60;
    const stateCheck = { ...payload.stateCheck, ...(problem ? { language: problem.language, level: problem.level } : {}) };
    const submission = await tx.activitySubmission.create({ data: {
      studentId: payload.studentId, templateId: payload.assignmentId, activityType: "codelab",
      variantSeed: payload.variantSeed, startedAt: new Date(payload.startedAt),
      completionTimeSeconds: payload.completionTimeSeconds, attempts: payload.attempts,
      stateCheck: JSON.stringify(stateCheck), score: payload.score, maxScore: 100, passed,
      errorLog: JSON.stringify(payload.errorLog ?? []),
    } });
    let reward = { grantedExp: 0, leveledUp: false, newLevel: 1 };
    if (passed) {
      const exp = await grantExp({ userId: payload.studentId,
        amount: payload.score === 100 ? EXP_VALUES.codelab_level_perfect : EXP_VALUES.codelab_level_complete,
        reason: `CodeLab: ${template.title} — Completed`, source: "codelab",
        ...(template.course.instituteId === instituteId ? { courseId: template.courseId } : {}),
        idempotencyKey: `codelab_complete_${payload.assignmentId}`,
      }, tx);
      reward = { grantedExp: exp.grantedAmount, leveledUp: exp.leveledUp, newLevel: exp.newLevel };
      await tx.activitySession.updateMany({ where: { studentId: payload.studentId, templateId: payload.assignmentId, status: "in_progress" }, data: { status: "submitted" } });
      if (!problem && template.syllabusItemId) await tx.studentSubmission.upsert({
        where: { syllabusItemId_studentId: { syllabusItemId: template.syllabusItemId, studentId: payload.studentId } },
        update: { grade: payload.score, status: "GRADED", submittedAt: new Date(), ...await academicProvenance('STARTED', tx) },
        create: { syllabusItemId: template.syllabusItemId, studentId: payload.studentId, grade: payload.score, status: "GRADED", submittedAt: new Date(), ...await academicProvenance('STARTED', tx) },
      });
    }
    return { submission, alreadyCompleted: false, ...reward, courseId: template.course.instituteId === instituteId ? template.courseId : "" };
  }, { timeout: 15000 });

  if (!result.alreadyCompleted && result.submission.passed) {
    try {
      await awardBadgeIfEarned(payload.studentId, "codelab-first");
      if (payload.score === 100) {
        await awardBadgeIfEarned(payload.studentId, "codelab-perfect-level");
        await awardBadgeIfEarned(payload.studentId, "perfect-score");
      }
      if (result.courseId) await processGamificationEvent(payload, result.courseId);
    } catch { console.warn("CODELAB_COMPLETION_BADGES_UNAVAILABLE"); }
  }
  return result;
}
