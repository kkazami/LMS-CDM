"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { executeSkill } from "@/lib/skills";
import { createNotification } from "@/lib/notifications";

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

export interface GradebookCell {
  submissionId: string | null;
  grade: number | null;
  status: string | null;
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
      grades[student.id][assignment.id] = { submissionId: null, grade: null, status: null };
    }
  }

  for (const sub of submissions) {
    if (grades[sub.studentId]?.[sub.syllabusItemId] !== undefined) {
      grades[sub.studentId][sub.syllabusItemId] = {
        submissionId: sub.id,
        grade: sub.grade,
        status: sub.status,
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

export async function updateGrade(submissionId: string, grade: number) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") return { success: false, error: "Instructors only" };

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

export async function upsertGrade(syllabusItemId: string, studentId: string, grade: number) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") return { success: false, error: "Instructors only" };

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

  // ── Notify the student about the new grade ──
  const syllabusItem = await db.syllabusItem.findUnique({
    where: { id: syllabusItemId },
    select: { title: true, type: true, course: { select: { code: true, instituteId: true } } },
  });
  if (syllabusItem) {
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
