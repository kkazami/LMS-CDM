"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { executeSkill } from "@/lib/skills";
import { createNotification } from "@/lib/notifications";
import { grantExp } from "@/lib/gamification/grant-exp";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";

async function ensureInstructor(courseId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") throw new Error("Instructors only");
  return session.user;
}

export interface GradebookStudent {
  id: string;
  name: string;
  email: string;
}

export interface GradebookAssignment {
  id: string;
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
  submissionId: string | null;
  grade: number | null;
  status: string | null;
  isReturned?: boolean;
  submittedAt?: string | null;
  attachments?: GradebookCellAttachment[];
}

export interface GradebookData {
  students: GradebookStudent[];
  assignments: GradebookAssignment[];
  grades: Record<string, Record<string, GradebookCell>>; // [studentId][assignmentId]
  gradingPolicy: {
    weights: { category: string; weightPercentage: number }[];
  } | null;
}

export async function getGradebookData(courseId: string): Promise<GradebookData> {
  await ensureInstructor(courseId);

  const [enrollments, syllabusItems, submissions, gradingPolicy] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId, status: "APPROVED" },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { student: { name: "asc" } },
    }),
    db.syllabusItem.findMany({
      where: { 
        courseId, 
        type: { not: "MATERIAL" },
        maxPoints: { not: null } 
      },
      select: { id: true, title: true, maxPoints: true, type: true, orderIndex: true },
      orderBy: { orderIndex: "asc" },
    }),
    db.studentSubmission.findMany({
      where: { syllabusItem: { courseId } },
      select: {
        id: true,
        syllabusItemId: true,
        studentId: true,
        grade: true,
        status: true,
        isReturned: true,
        submittedAt: true,
        attachments: {
          select: {
            id: true,
            type: true,
            url: true,
            fileName: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.gradingPolicy.findUnique({
      where: { courseId },
      include: { weights: true },
    }),
  ]);

  const students = enrollments.map((e) => e.student);
  const assignments = syllabusItems;

  // Build grade matrix
  const grades: GradebookData["grades"] = {};
  for (const student of students) {
    grades[student.id] = {};
    for (const assignment of assignments) {
      grades[student.id][assignment.id] = { submissionId: null, grade: null, status: null, attachments: [] };
    }
  }

  for (const sub of submissions) {
    if (grades[sub.studentId]?.[sub.syllabusItemId] !== undefined) {
      grades[sub.studentId][sub.syllabusItemId] = {
        submissionId: sub.id,
        grade: sub.grade,
        status: sub.status,
        isReturned: sub.isReturned,
        submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
        attachments: sub.attachments.map((a) => ({
          id: a.id,
          type: a.type,
          url: a.url,
          fileName: a.fileName,
        })),
      };
    }
  }

  return { 
    students, 
    assignments, 
    grades,
    gradingPolicy: gradingPolicy ? {
      weights: gradingPolicy.weights.map(w => ({
        category: w.category,
        weightPercentage: w.weightPercentage
      }))
    } : null
  };
}

export async function updateGrade(submissionId: string, rawGrade: number) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") return { success: false, error: "Instructors only" };

  const existing = await db.studentSubmission.findUnique({
    where: { id: submissionId },
    select: { syllabusItem: { select: { maxPoints: true } } },
  });

  let grade = Math.max(0, rawGrade);
  if (existing?.syllabusItem?.maxPoints !== null && existing?.syllabusItem?.maxPoints !== undefined) {
    grade = Math.min(existing.syllabusItem.maxPoints, grade);
  }

  const submission = await db.studentSubmission.update({
    where: { id: submissionId },
    data: { grade, status: "RETURNED", isReturned: true },
    select: {
      studentId: true,
      syllabusItem: {
        select: { title: true, type: true, course: { select: { code: true, instituteId: true } } },
      },
    },
  });

  // ── Grade Incentive evaluation ──
  try {
    const rules = await db.gradeIncentiveRule.findMany({
      where: { courseId: submission.syllabusItem.course.instituteId ? undefined : undefined, isActive: true },
    });
    // Find rules specifically for this course
    const courseRules = await db.gradeIncentiveRule.findMany({
      where: { isActive: true },
    });
    for (const rule of courseRules) {
      if (grade >= rule.gradeMin) {
        await grantExp({
          userId: submission.studentId,
          amount: rule.bonusExp,
          reason: `Grade Incentive: ${rule.label} (${grade}% in ${submission.syllabusItem.course.code})`,
          source: "grade_incentive",
        });
      }
    }
    if (grade >= 100) {
      await awardBadgeIfEarned(submission.studentId, "perfect-score");
    }
  } catch (incErr) {
    console.error("GRADE_INCENTIVE_TRIGGER_ERROR", incErr);
  }

  // ── Notify the student about the new grade ──
  const itemLabel = submission.syllabusItem.type === "QUIZ" ? "Quiz" : "Assignment";
  const institute = await db.institute.findFirst({ where: { id: submission.syllabusItem.course.instituteId }, select: { code: true } });
  const instCode = institute?.code || "ics";
  await createNotification({
    userId: submission.studentId,
    type: "GRADE",
    title: "Grade posted",
    message: `New grade for ${itemLabel}: ${submission.syllabusItem.title} in ${submission.syllabusItem.course.code}`,
    link: `/${instCode}/grades`,
  });

  return { success: true };
}

export async function upsertGrade(syllabusItemId: string, studentId: string, rawGrade: number) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") return { success: false, error: "Instructors only" };

  const syllabusItem = await db.syllabusItem.findUnique({
    where: { id: syllabusItemId },
    select: { title: true, type: true, maxPoints: true, courseId: true, course: { select: { code: true, instituteId: true } } },
  });

  let grade = Math.max(0, rawGrade);
  if (syllabusItem?.maxPoints !== null && syllabusItem?.maxPoints !== undefined) {
    grade = Math.min(syllabusItem.maxPoints, grade);
  }

  await db.studentSubmission.upsert({
    where: {
      syllabusItemId_studentId: {
        syllabusItemId,
        studentId,
      },
    },
    update: {
      grade,
      status: "RETURNED",
      isReturned: true,
    },
    create: {
      syllabusItemId,
      studentId,
      grade,
      status: "RETURNED",
      isReturned: true,
    },
  });

  // ── Notify the student about the new grade & check incentives ──
  if (syllabusItem) {
    try {
      const courseRules = await db.gradeIncentiveRule.findMany({
        where: { courseId: syllabusItem.courseId, isActive: true },
      });
      for (const rule of courseRules) {
        if (grade >= rule.gradeMin) {
          await grantExp({
            userId: studentId,
            amount: rule.bonusExp,
            reason: `Grade Incentive: ${rule.label} (${grade}% in ${syllabusItem.course.code})`,
            source: "grade_incentive",
            courseId: syllabusItem.courseId,
          });
        }
      }
      if (grade >= 100) {
        await awardBadgeIfEarned(studentId, "perfect-score");
      }
    } catch (incErr) {
      console.error("GRADE_INCENTIVE_TRIGGER_ERROR", incErr);
    }

    const itemLabel = syllabusItem.type === "QUIZ" ? "Quiz" : "Assignment";
    const institute = await db.institute.findFirst({ where: { id: syllabusItem.course.instituteId }, select: { code: true } });
    const instCode = institute?.code || "ics";
    await createNotification({
      userId: studentId,
      type: "GRADE",
      title: "Grade posted",
      message: `New grade for ${itemLabel}: ${syllabusItem.title} in ${syllabusItem.course.code}`,
      link: `/${instCode}/grades`,
    });
  }

  return { success: true };
}

export async function clearGrade(syllabusItemId: string, studentId: string) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") return { success: false, error: "Instructors only" };

  const existing = await db.studentSubmission.findUnique({
    where: {
      syllabusItemId_studentId: {
        syllabusItemId,
        studentId,
      },
    },
    include: {
      attachments: true,
    },
  });

  if (!existing) return { success: true };

  // If the student never actually submitted anything (no attachments and never submitted):
  // Delete the placeholder submission created by the accidental grade!
  if (existing.attachments.length === 0 && !existing.submittedAt) {
    await db.studentSubmission.delete({
      where: { id: existing.id },
    });
  } else {
    // The student DID submit work: reset grade to null and status to SUBMITTED
    await db.studentSubmission.update({
      where: { id: existing.id },
      data: {
        grade: null,
        status: "SUBMITTED",
        isReturned: false,
      },
    });
  }

  return { success: true };
}

export async function saveGradingPolicy(
  courseId: string, 
  weights: { category: string; weightPercentage: number }[]
) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") return { success: false, error: "Instructors only" };

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
  return executeSkill("gradebook-exporter", async () => {
    await ensureInstructor(courseId);

    const data = await getGradebookData(courseId);

    // Build CSV
    const assignmentHeaders = data.assignments.map((a) => `"${a.title.replace(/"/g, '""')} (${a.maxPoints ?? '∞'} pts)"`);
    const header = ["Student Name", "Email", ...assignmentHeaders].join(",");

    const rows = data.students.map((student) => {
      const grades = data.assignments.map((a) => {
        const cell = data.grades[student.id]?.[a.id];
        return cell?.grade !== null && cell?.grade !== undefined ? cell.grade : "";
      });
      return [`"${student.name.replace(/"/g, '""')}"`, `"${student.email}"`, ...grades].join(",");
    });

    const csvContent = [header, ...rows].join("\n");
    const courseInfo = await db.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });

    const fileName = `gradebook-${(courseInfo?.title ?? courseId).replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;

    return { csvContent, fileName };
  });
}
