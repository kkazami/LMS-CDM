"use server";
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';


import { administratorInstitute } from '@/lib/administrator-scope';
import { db } from "@/lib/db";
import { executeSkill } from "./index";
import type { SkillResult } from "./index";

interface BulkAssignInput {
  assignments: Array<{
    courseId: string;
    instructorId: string;
  }>;
  /** Institute ID for multi-tenancy validation */
  instituteId: string;
}

interface BulkAssignOutput {
  updatedCount: number;
  results: Array<{
    courseId: string;
    instructorId: string;
    status: "success" | "error";
    error?: string;
  }>;
}

/**
 * Agentic Skill: Bulk Assign Instructor
 *
 * Assigns an instructor (PROFESSOR role) to one or many courses atomically.
 * Validates that both the instructor and course belong to the same institute.
 * Uses a Prisma transaction block for atomic multi-model updates.
 */
export async function bulkAssignInstructor(
  input: BulkAssignInput
): Promise<SkillResult<BulkAssignOutput>> {
  const actor = await requireLegacyActor("apps/web/src/lib/skills/bulk-assign-instructor.ts#bulkAssignInstructor");

  return executeSkill("bulkAssignInstructor", async () => {
    const isAdmin = actor.role.toUpperCase() === 'ADMIN';
    if (isAdmin) await administratorInstitute(actor);
    else if (!['PROFESSOR','TEACHER','INSTRUCTOR'].includes(actor.role.toUpperCase())) throw new Error('Instructor or Administrator required.');
    if (input.instituteId !== actor.instituteId) throw new Error("Forbidden institute.");
    if (!input.assignments.length || input.assignments.length > 500) throw new Error('Invalid assignment count.');
    const results: BulkAssignOutput["results"] = [];

    await db.$transaction(async (tx) => {
      for (const assignment of input.assignments) {
        try {
          // Validate instructor exists, is PROFESSOR, and belongs to this institute
          const instructor = await tx.user.findUnique({
            where: { id: assignment.instructorId },
            select: { id: true, role: true, instituteId: true },
          });

          if (!instructor) {
            results.push({
              ...assignment,
              status: "error",
              error: "Instructor not found",
            });
            continue;
          }

          if (
            instructor.role !== "PROFESSOR" &&
            instructor.role !== "TEACHER"
          ) {
            results.push({
              ...assignment,
              status: "error",
              error: `User is not an instructor (role: ${instructor.role})`,
            });
            continue;
          }

          if (instructor.instituteId !== input.instituteId) {
            results.push({
              ...assignment,
              status: "error",
              error: "Instructor does not belong to this institute",
            });
            continue;
          }

          // Validate course belongs to this institute
          const course = await tx.course.findUnique({
            where: { id: assignment.courseId },
            select: { id: true, instituteId: true, instructorId: true },
          });

          if (!course) {
            results.push({
              ...assignment,
              status: "error",
              error: "Course not found",
            });
            continue;
          }

          if (course.instituteId !== input.instituteId || !isAdmin && (course.instructorId !== actor.id || assignment.instructorId !== actor.id)) {
            results.push({
              ...assignment,
              status: "error",
              error: "Course does not belong to this institute",
            });
            continue;
          }

          // Perform assignment
          await tx.course.update({
            where: { id: assignment.courseId },
            data: { instructorId: assignment.instructorId },
          });

          results.push({ ...assignment, status: "success" });
        } catch (err) {
          results.push({
            ...assignment,
            status: "error",
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    });

    return {
      updatedCount: results.filter((r) => r.status === "success").length,
      results,
    };
  });
}
