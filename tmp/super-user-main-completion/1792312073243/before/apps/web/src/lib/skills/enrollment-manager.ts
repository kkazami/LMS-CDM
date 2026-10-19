"use server";

import { db } from "@/lib/db";
import { executeSkill } from "./index";
import type { SkillResult } from "./index";

type EnrollmentAction = "approve" | "decline" | "auto-process";

interface EnrollmentInput {
  enrollmentIds: string[];
  action: EnrollmentAction;
  /** Course ID for context validation */
  courseId: string;
  /** The user performing the action (for permission checks) */
  actorId: string;
}

interface EnrollmentOutput {
  processedCount: number;
  results: Array<{
    enrollmentId: string;
    studentId: string;
    status: string;
    action: string;
  }>;
}

/**
 * Agentic Skill: Enrollment Manager
 *
 * Processes enrollment requests: approve, decline, or auto-process based on rules.
 * Auto-process mode will approve all pending requests (can be extended with
 * capacity limits, duplicate detection, etc.)
 *
 * Can be triggered by:
 * - Instructor manually approving/declining from the People tab
 * - System triggers (e.g., scheduled batch processing)
 * - Future LLM integration for smart enrollment decisions
 */
export async function enrollmentManager(
  input: EnrollmentInput
): Promise<SkillResult<EnrollmentOutput>> {
  return executeSkill("enrollmentManager", async () => {
    const results: EnrollmentOutput["results"] = [];

    // Validate the actor has permission over this course
    const course = await db.course.findUnique({
      where: { id: input.courseId },
      select: { instructorId: true, instituteId: true },
    });

    if (!course) {
      throw new Error("Course not found");
    }

    // Check that the actor is the course instructor or an admin
    const actor = await db.user.findUnique({
      where: { id: input.actorId },
      select: { role: true, instituteId: true },
    });

    if (!actor) {
      throw new Error("Actor not found");
    }

    const isInstructor = course.instructorId === input.actorId;
    const isAdmin = actor.role === "ADMIN";

    if (!isInstructor && !isAdmin) {
      throw new Error("Unauthorized: only the course instructor or admin can manage enrollments");
    }

    if (input.action === "auto-process") {
      // Auto-process: approve all pending enrollments for this course
      const pendingEnrollments = await db.enrollment.findMany({
        where: {
          courseId: input.courseId,
          status: "PENDING",
        },
        select: { id: true, studentId: true },
      });

      await db.enrollment.updateMany({
        where: {
          courseId: input.courseId,
          status: "PENDING",
        },
        data: { status: "APPROVED" },
      });

      for (const enrollment of pendingEnrollments) {
        results.push({
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          status: "APPROVED",
          action: "auto-process",
        });
      }
    } else {
      // Manual approve/decline specific enrollments
      const newStatus = input.action === "approve" ? "APPROVED" : "DECLINED";

      for (const enrollmentId of input.enrollmentIds) {
        const enrollment = await db.enrollment.findUnique({
          where: { id: enrollmentId },
          select: { id: true, studentId: true, courseId: true, status: true },
        });

        if (!enrollment || enrollment.courseId !== input.courseId) {
          continue;
        }

        if (enrollment.status !== "PENDING") {
          results.push({
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            status: enrollment.status,
            action: `skipped (already ${enrollment.status})`,
          });
          continue;
        }

        await db.enrollment.update({
          where: { id: enrollmentId },
          data: { status: newStatus },
        });

        results.push({
          enrollmentId: enrollment.id,
          studentId: enrollment.studentId,
          status: newStatus,
          action: input.action,
        });
      }
    }

    return {
      processedCount: results.length,
      results,
    };
  });
}
