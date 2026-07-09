"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";

// ─── Shared helpers ───

async function getStudentSession() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  return session.user;
}

async function ensureBeforeDeadline(syllabusItemId: string) {
  const item = await db.syllabusItem.findUnique({
    where: { id: syllabusItemId },
    select: { dueDate: true },
  });
  if (item?.dueDate && new Date() > item.dueDate) {
    throw new Error("The deadline has passed. You can no longer modify your submission.");
  }
}

// ─── Submission Actions ───

export async function getOrCreateSubmission(syllabusItemId: string) {
  const user = await getStudentSession();

  let submission = await db.studentSubmission.findUnique({
    where: { syllabusItemId_studentId: { syllabusItemId, studentId: user.id } },
    include: { attachments: true },
  });

  if (!submission) {
    submission = await db.studentSubmission.create({
      data: { syllabusItemId, studentId: user.id, status: "DRAFT" },
      include: { attachments: true },
    });
  }

  return submission;
}

export async function submitWork(submissionId: string, instituteCode: string, courseId: string, itemId: string) {
  const user = await getStudentSession();

  const submission = await db.studentSubmission.findUnique({
    where: { id: submissionId },
    select: { studentId: true, syllabusItemId: true, status: true },
  });

  if (!submission || submission.studentId !== user.id) {
    return { success: false, error: "Submission not found or unauthorized." };
  }

  await ensureBeforeDeadline(submission.syllabusItemId);

  await db.studentSubmission.update({
    where: { id: submissionId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true };
}

export async function unsubmitWork(submissionId: string, instituteCode: string, courseId: string, itemId: string) {
  const user = await getStudentSession();

  const submission = await db.studentSubmission.findUnique({
    where: { id: submissionId },
    select: { studentId: true, syllabusItemId: true },
  });

  if (!submission || submission.studentId !== user.id) {
    return { success: false, error: "Submission not found or unauthorized." };
  }

  await ensureBeforeDeadline(submission.syllabusItemId);

  await db.studentSubmission.update({
    where: { id: submissionId },
    data: { status: "DRAFT", submittedAt: null },
  });

  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true };
}

export async function addSubmissionLink(
  submissionId: string,
  url: string,
  fileName: string,
  instituteCode: string,
  courseId: string,
  itemId: string
) {
  const user = await getStudentSession();

  const submission = await db.studentSubmission.findUnique({
    where: { id: submissionId },
    select: { studentId: true, syllabusItemId: true, status: true },
  });

  if (!submission || submission.studentId !== user.id) {
    return { success: false, error: "Submission not found or unauthorized." };
  }

  await ensureBeforeDeadline(submission.syllabusItemId);

  if (submission.status === "SUBMITTED") {
    await db.studentSubmission.update({
      where: { id: submissionId },
      data: { status: "DRAFT" },
    });
  }

  await db.submissionAttachment.create({
    data: { submissionId, type: "LINK", url, fileName },
  });

  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true };
}

export async function removeSubmissionAttachment(
  attachmentId: string,
  submissionId: string,
  instituteCode: string,
  courseId: string,
  itemId: string
) {
  const user = await getStudentSession();

  const submission = await db.studentSubmission.findUnique({
    where: { id: submissionId },
    select: { studentId: true, syllabusItemId: true },
  });

  if (!submission || submission.studentId !== user.id) {
    return { success: false, error: "Unauthorized." };
  }

  await ensureBeforeDeadline(submission.syllabusItemId);

  await db.submissionAttachment.delete({ where: { id: attachmentId } });

  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true };
}

export async function addSubmissionFile(
  submissionId: string,
  url: string,
  fileName: string,
  instituteCode: string,
  courseId: string,
  itemId: string
) {
  const user = await getStudentSession();

  const submission = await db.studentSubmission.findUnique({
    where: { id: submissionId },
    select: { studentId: true, syllabusItemId: true, status: true },
  });

  if (!submission || submission.studentId !== user.id) {
    return { success: false, error: "Submission not found or unauthorized." };
  }

  await ensureBeforeDeadline(submission.syllabusItemId);

  // Revert to DRAFT when new attachment is added
  if (submission.status === "SUBMITTED") {
    await db.studentSubmission.update({
      where: { id: submissionId },
      data: { status: "DRAFT" },
    });
  }

  const attachment = await db.submissionAttachment.create({
    data: { submissionId, type: "FILE", url, fileName },
  });

  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}`);
  return { success: true, attachmentId: attachment.id };
}

// ─── Instructor Grading Actions ───

export async function returnGrade(
  submissionId: string,
  grade: number,
  privateComment: string | undefined,
  instituteCode: string,
  courseId: string,
  itemId: string
) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can grade submissions." };
  }

  await db.studentSubmission.update({
    where: { id: submissionId },
    data: { grade, status: "RETURNED", isReturned: true },
  });

  revalidatePath(`/${instituteCode}/courses/${courseId}/classwork/${itemId}/submissions`);
  revalidatePath(`/${instituteCode}/courses/${courseId}/gradebook`);
  return { success: true };
}

export async function updateGrade(submissionId: string, grade: number) {
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };

  const role = session.user.role.toUpperCase();
  if (role !== "PROFESSOR" && role !== "ADMIN") {
    return { success: false, error: "Only instructors can update grades." };
  }

  await db.studentSubmission.update({
    where: { id: submissionId },
    data: { grade },
  });

  return { success: true };
}
