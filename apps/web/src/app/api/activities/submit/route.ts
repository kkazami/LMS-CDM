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
import { getProblemById } from "@/features/interactive-activities/codelab/problems";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

    // 4. Verify the template exists (the assignmentId maps to a templateId)
    let template = await db.activityTemplate.findUnique({
      where: { id: payload.assignmentId },
      select: { id: true, activityType: true, courseId: true, syllabusItemId: true },
    });

    if (!template && payload.activityType === "codelab") {
      const problem = getProblemById(payload.assignmentId);
      // Find an active course to bind the problem template
      const enrollment = await db.enrollment.findFirst({
        where: { studentId: payload.studentId, status: "ACTIVE" },
        select: { courseId: true },
      });

      let courseId = enrollment?.courseId;
      if (!courseId) {
        const firstCourse = await db.course.findFirst({
          select: { id: true },
        });
        courseId = firstCourse?.id;
      }

      if (courseId) {
        template = await db.activityTemplate.upsert({
          where: { id: payload.assignmentId },
          update: {},
          create: {
            id: payload.assignmentId,
            title: problem?.title || "CodeLab Problem",
            activityType: "codelab",
            courseId: courseId,
            createdBy: eligibility.session.user.id,
            difficulty: problem?.stage === "basics" ? 1 : problem?.stage === "building-up" ? 2 : 3,
            variables: JSON.stringify(problem?.variables || []),
            hiddenTestCases: JSON.stringify(problem?.testCases.filter((tc) => tc.isHidden) || []),
          },
          select: { id: true, activityType: true, courseId: true, syllabusItemId: true },
        });
      }
    }

    if (!template) {
      return NextResponse.json(
        { message: "Activity template not found." },
        { status: 404 }
      );
    }

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

    // 7. Fire Gamification Hook (Sprint 7)
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
    console.error("ACTIVITY_SUBMIT_ERROR", error);

    return NextResponse.json(
      { message: "Something went wrong while processing the submission." },
      { status: 500 }
    );
  }
}
