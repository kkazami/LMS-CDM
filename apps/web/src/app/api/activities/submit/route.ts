import { boundedJson } from '@/lib/roster/policy';
import { academicProvenance } from '@/lib/labs/readiness';
import { assertOrdinaryClasswork, markAcademicWorkStarted } from '@/lib/academic-task';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
/**
 * POST /api/activities/submit
 *
 * Shared submission endpoint for all Interactive Activity types.
 * Validates the payload, enforces ICS eligibility, and writes to the database.
 *
 * Consumers: useActivitySubmission() hook (Sprint 0) and future activity modules.
 *
 * Security:
 *   1. Requires valid session (401 if missing)
 *   2. Requires ICS eligibility (403 if wrong institute)
 *   3. Validates payload against Zod schema (400 if invalid)
 *   4. Ensures studentId matches the session user (403 if spoofed)
 */

import { NextResponse } from "next/server";
import { checkActivityEligibility } from "@/lib/activity-eligibility";
import { activitySubmissionInputSchema } from "@/features/interactive-activities/shared/schemas";
import { ActivityGradingError, gradeActivity } from '@/features/interactive-activities/shared/grade-activity';
import { requireCourseAccess } from '@/lib/course-access';
import { db } from "@/lib/db";
import { processGamificationEvent } from "@/features/interactive-activities/gamification/engine";
import { CodeLabCompletionError, getCodeLabCompletion, getCodeLabReward, saveCodeLabCompletion } from "@/lib/codelab-completion";
import { getProblemById } from "@/features/interactive-activities/codelab/problems";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(request, "POST activities/submit/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    // 1. Auth + eligibility check
    const eligibility = await checkActivityEligibility();

    if (!eligibility) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }

    if (!eligibility.eligible) {
      return NextResponse.json(
        {
          message:
            "Interactive Activities are only available for ICS students and instructors (BSIT/BSCpE programs).",
        },
        { status: 403 }
      );
    }

    // 2. Parse and validate the submission payload
    const body: unknown = await boundedJson(request, 512 * 1024);
    const parsed = activitySubmissionInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Validation failed.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    // 3. Ensure the studentId matches the authenticated user
    // Prevents a student from submitting on behalf of another student.
    if (payload.studentId !== eligibility.session.user.id) {
      return NextResponse.json(
        {
          message:
            "Forbidden: studentId does not match the authenticated user.",
        },
        { status: 403 }
      );
    }

    if (payload.activityType === "codelab") {
      const completed = await getCodeLabCompletion(payload.studentId, payload.assignmentId) || await getCodeLabReward(payload.studentId, payload.assignmentId);
      if (completed) return NextResponse.json({ message: "This level is already completed. You can still run code for practice.", completed: true }, { status: 409 });
      const problem = getProblemById(payload.assignmentId);
      if (!problem || problem.executionMethod === "judge0") return NextResponse.json({ message: "Use Submit Solution to evaluate and save this CodeLab level." }, { status: 400 });
      const sourceCode = payload.stateCheck.sourceCode;
      if (typeof sourceCode !== "string" || new TextEncoder().encode(sourceCode).length > 64 * 1024) return NextResponse.json({ message: "A solution of at most 64 KB is required." }, { status: 400 });
      const result = await saveCodeLabCompletion(payload, eligibility.session.user.instituteId);
      return NextResponse.json({ message: result.alreadyCompleted ? "Level already completed." : "Submission saved.", ...result }, { status: result.alreadyCompleted ? 409 : 201 });
    }

    // 4. Verify the template exists (the assignmentId maps to a templateId)
    const template = await db.activityTemplate.findUnique({
      where: { id: payload.assignmentId },
      select: { id: true, title: true, activityType: true, courseId: true, syllabusItemId: true },
    });

    if (!template) {
      return NextResponse.json(
        { message: "Activity template not found." },
        { status: 404 }
      );
    }
    if (template.activityType !== payload.activityType) return NextResponse.json({ message: "Incorrect activity type." }, { status: 400 });

    await requireCourseAccess(eligibility.session.user, template.courseId);
    const { submission, outcome } = await db.$transaction(async tx => {
      if (template.syllabusItemId) {
        await assertOrdinaryClasswork(tx, template.syllabusItemId);
        await markAcademicWorkStarted(tx, template.syllabusItemId, payload.studentId);
      }
      await tx.$queryRaw`SELECT id FROM "ActivityTemplate" WHERE id = ${template.id} FOR UPDATE`;
      const currentTemplate = await tx.activityTemplate.findUnique({ where: { id: template.id } });
      if (!currentTemplate || currentTemplate.syllabusItemId !== template.syllabusItemId || currentTemplate.courseId !== template.courseId || currentTemplate.activityType !== payload.activityType) throw new AccessError(409, 'Activity linkage changed. Retry.');
      await requireCourseAccess(eligibility.session.user, currentTemplate.courseId, false, tx);
      let gradeMaximum = 100;
      if (currentTemplate.syllabusItemId) {
        const item = await tx.syllabusItem.findFirst({ where: { id: currentTemplate.syllabusItemId, courseId: currentTemplate.courseId }, select: { id: true, maxPoints: true } });
        if (!item) throw new AccessError(409, 'Activity coursework does not belong to this course.');
        gradeMaximum = item.maxPoints ?? 100;
        if (gradeMaximum < 0) throw new AccessError(409, 'Activity points need reconciliation.');
      }
      const computed = gradeActivity(payload.activityType, payload.answers, currentTemplate, payload.variantSeed);
      const grade = Math.round(computed.score / computed.maxScore * gradeMaximum * 100) / 100;
      // 5. Write the submission to the database
      const saved = await tx.activitySubmission.create({
        data: {
          studentId: payload.studentId,
          templateId: payload.assignmentId,
          activityType: payload.activityType,
          variantSeed: payload.variantSeed,
          startedAt: new Date(payload.startedAt),
          completionTimeSeconds: payload.completionTimeSeconds,
          attempts: payload.attempts,
          stateCheck: JSON.stringify({ answers: payload.answers, ...computed.stateCheck }),
          score: computed.score,
          maxScore: computed.maxScore,
          passed: computed.passed,
          errorLog: '[]',
        },
        select: {
          id: true,
          score: true,
          maxScore: true,
          passed: true,
          submittedAt: true,
        },
      });

      // 6. If there's an active session for this student+template, mark it as submitted
      await tx.activitySession.updateMany({
        where: {
          studentId: payload.studentId,
          templateId: payload.assignmentId,
          status: "in_progress",
        },
        data: {
          status: "submitted",
        },
      });

      // 8. Grade Passback to LMS Gradebook (Sprint 8)
      if (template.syllabusItemId) {
        await tx.studentSubmission.upsert({
            where: {
              syllabusItemId_studentId: {
                syllabusItemId: template.syllabusItemId,
                studentId: payload.studentId,
              },
            },
            update: {
              grade,
              ...await academicProvenance('STARTED', tx),
              status: "GRADED",
              submittedAt: new Date(),
            },
            create: {
              syllabusItemId: template.syllabusItemId,
              studentId: payload.studentId,
              grade,
              ...await academicProvenance('STARTED', tx),
              status: "GRADED",
              submittedAt: new Date(),
            },
          });
      }

      return { submission: saved, outcome: { ...payload, ...computed } };
    });
    try { await processGamificationEvent(outcome, template.courseId); }
    catch { console.warn('GAMIFICATION_UNAVAILABLE'); }

    return NextResponse.json(
      {
        message: "Submission recorded successfully.",
        submission: {
          id: submission.id,
          score: submission.score,
          maxScore: submission.maxScore,
          passed: submission.passed,
          submittedAt: submission.submittedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ActivityGradingError) return NextResponse.json({ message: error.message }, { status: 400 });
    if (error instanceof AccessError) return accountErrorResponse(error);
    if (error instanceof CodeLabCompletionError) return NextResponse.json({ message: error.message, completed: error.status === 409 }, { status: error.status });
    console.error("ACTIVITY_SUBMIT_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong while processing the submission." },
      { status: 500 }
    );
  }
}
