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
import { activitySubmissionSchema } from "@/features/interactive-activities/shared/schemas";
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
    const body: unknown = await request.json();
    const parsed = activitySubmissionSchema.safeParse(body);

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

    // 5. Write the submission to the database
    const submission = await db.activitySubmission.create({
      data: {
        studentId: payload.studentId,
        templateId: payload.assignmentId,
        activityType: payload.activityType,
        variantSeed: payload.variantSeed,
        startedAt: new Date(payload.startedAt),
        completionTimeSeconds: payload.completionTimeSeconds,
        attempts: payload.attempts,
        stateCheck: JSON.stringify(payload.stateCheck),
        score: payload.score,
        maxScore: payload.maxScore,
        passed: payload.passed,
        errorLog: JSON.stringify(payload.errorLog ?? []),
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
    await db.activitySession.updateMany({
      where: {
        studentId: payload.studentId,
        templateId: payload.assignmentId,
        status: "in_progress",
      },
      data: {
        status: "submitted",
      },
    });

    // 7. Fire Gamification Hook
    try {
      await processGamificationEvent(payload, template.courseId);

    } catch (gamiErr) {
      console.error("GAMIFICATION_ERROR", gamiErr);
    }

    // 8. Grade Passback to LMS Gradebook (Sprint 8)
    if (template.syllabusItemId) {
      try {
        await db.studentSubmission.upsert({
          where: {
            syllabusItemId_studentId: {
              syllabusItemId: template.syllabusItemId,
              studentId: payload.studentId,
            },
          },
          update: {
            grade: payload.score,
            status: "GRADED",
            submittedAt: new Date(),
          },
          create: {
            syllabusItemId: template.syllabusItemId,
            studentId: payload.studentId,
            grade: payload.score,
            status: "GRADED",
            submittedAt: new Date(),
          },
        });
      } catch (gradeErr) {
        console.error("GRADE_PASSBACK_ERROR", gradeErr);
      }
    }

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
    if (error instanceof CodeLabCompletionError) return NextResponse.json({ message: error.message, completed: error.status === 409 }, { status: error.status });
    console.error("ACTIVITY_SUBMIT_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong while processing the submission." },
      { status: 500 }
    );
  }
}
