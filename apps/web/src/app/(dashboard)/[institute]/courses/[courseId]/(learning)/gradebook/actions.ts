"use server";
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';


import { assertOrdinaryClasswork, markAcademicWorkStarted } from '@/lib/academic-task';
import { exportGradebookSkill } from '@/lib/skills/gradebook-exporter';
import { readGradebook } from '@/lib/gradebook-data';
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { executeSkill } from "@/lib/skills";
import { createNotification } from "@/lib/notifications";
import { gradeSubmission, gradeStudent, lockAcademicRecord } from "@/lib/academic-records";
import { requireCourseAccess } from "@/lib/course-access";
import { canonicalRole } from "@/lib/super-user-v1/capabilities";
import { savePeriodAssignments, savePeriodPolicy } from '@/lib/grading/period-service';
import type { ItemPeriod, PeriodPolicy } from '@/lib/grading/periods';

async function ensureInstructor(courseId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const role = session.user.role.toUpperCase();
  if (!['ADMIN', 'INSTRUCTOR'].includes(canonicalRole(role))) throw new Error("Instructors only");
  await requireCourseAccess(session.user, courseId, true);
  return session.user;
}

export interface GradebookStudent {
  id: string;
  name: string;
  email: string;
}

export interface GradebookAssignment {
  gradingPeriod: ItemPeriod;
  id: string;
  labAssignmentId?: string | null;
  labCanManage?: boolean;
  title: string;
  maxPoints: number | null;
  type: string;
}

export interface GradebookCellAttachment {
  id: string;
  type: string;
  url: string;
  fileName: string;
}

export interface GradebookCell {
  labAttemptId?: string | null;
  labRevision?: number | null;
  labStatus?: string | null;
  submissionId: string | null;
  grade: number | null;
  status: string | null;
  isReturned?: boolean;
  submittedAt?: string | null;
  attachments?: GradebookCellAttachment[];
}

export interface GradebookData {
  periodPolicy: PeriodPolicy;
  periodsAvailable: boolean;
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  students: GradebookStudent[];
  assignments: GradebookAssignment[];
  grades: Record<string, Record<string, GradebookCell>>; // [studentId][assignmentId]
  gradingPolicy: {
    weights: { category: string; weightPercentage: number }[];
  } | null;
}

export async function getGradebookData(courseId: string, page = 1): Promise<GradebookData> {
  const actor = await requireLegacyActor('gradebook/actions.ts#getGradebookData', { courseId });
  return readGradebook(actor, courseId, page);
}
export async function saveGradebookPeriodPolicy(courseId: string, input: unknown) {
  const actor = await requireLegacyActor('gradebook/actions.ts#saveGradebookPeriodPolicy', { courseId });
  await savePeriodPolicy(actor, courseId, input);
  return { success: true };
}
export async function assignGradebookPeriods(courseId: string, input: unknown) {
  const actor = await requireLegacyActor('gradebook/actions.ts#assignGradebookPeriods', { courseId });
  await savePeriodAssignments(actor, courseId, input);
  return { success: true };
}
export async function updateGrade(submissionId: string, rawGrade: number) {
  const user = await requireLegacyActor("gradebook/actions.ts#updateGrade", () => ({ submissionId }));
  await gradeSubmission(user, submissionId, rawGrade);
  return { success: true };
}
export async function upsertGrade(syllabusItemId: string, studentId: string, rawGrade: number) {
  const user = await requireLegacyActor("gradebook/actions.ts#upsertGrade", () => ({ syllabusItemId, studentId }));
  await gradeStudent(user, syllabusItemId, studentId, rawGrade);
  return { success: true };
}

export async function clearGrade(syllabusItemId: string, studentId: string) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/gradebook/actions.ts#clearGrade", () => ({ syllabusItemId, studentId }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (!['ADMIN', 'INSTRUCTOR'].includes(canonicalRole(role))) return { success: false, error: "Instructors only" };

  await db.$transaction(async tx => {
    await assertOrdinaryClasswork(tx, syllabusItemId);
    await lockAcademicRecord(tx, studentId, syllabusItemId);
    const item = await tx.syllabusItem.findUnique({ where: { id: syllabusItemId } });
    if (!item) throw new Error("Assignment not found");
    await requireCourseAccess(session.user, item.courseId, true, tx);
    const existing = await tx.studentSubmission.findUnique({ where: { syllabusItemId_studentId: { syllabusItemId, studentId } }, include: { attachments: true } });
    if (!existing) return;
    await markAcademicWorkStarted(tx, syllabusItemId, studentId);
    await tx.studentSubmission.update({ where: { id: existing.id }, data: { grade: null, status: existing.submittedAt ? "SUBMITTED" : "DRAFT", isReturned: false } });
  });

  return { success: true };
}

export async function saveGradingPolicy(
  courseId: string, 
  weights: { category: string; weightPercentage: number }[]
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/gradebook/actions.ts#saveGradingPolicy", () => ({ courseId }));

  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (!['ADMIN', 'INSTRUCTOR'].includes(canonicalRole(role))) return { success: false, error: "Instructors only" };

  await ensureInstructor(courseId);

  // Calculate total to ensure it's 100%
  const total = weights.reduce((acc, w) => acc + w.weightPercentage, 0);
  if (Math.abs(total - 100) > 0.01) {
    return { success: false, error: "Weights must equal exactly 100%" };
  }

  // Use transaction to overwrite policy
  await db.$transaction(async (tx) => {
    let policy = await tx.gradingPolicy.findUnique({ where: { courseId } });
    
    if (!policy) {
      policy = await tx.gradingPolicy.create({ data: { courseId } });
    }

    // Delete existing weights
    await tx.categoryWeight.deleteMany({
      where: { gradingPolicyId: policy.id }
    });

    // Insert new weights
    if (weights.length > 0) {
      await tx.categoryWeight.createMany({
        data: weights.map(w => ({
          gradingPolicyId: policy!.id,
          category: w.category,
          weightPercentage: w.weightPercentage
        }))
      });
    }
  });

  return { success: true };
}

export async function exportGradebook(courseId: string) {
  await requireLegacyActor('gradebook/actions.ts#exportGradebook', { courseId });
  return executeSkill('gradebook-exporter', () => exportGradebookSkill(courseId));
}
