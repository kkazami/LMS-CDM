"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { enrollmentManager, flagSentiment } from "@/lib/skills";

async function ensureCourseAccess(courseId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });

  if (!course) throw new Error("Course not found");

  const role = session.user.role.toUpperCase();
  const isInstructor = course.instructorId === session.user.id;
  const isAdmin = role === "ADMIN";

  if (!isInstructor && !isAdmin) {
    throw new Error("Unauthorized: only instructor or admin");
  }

  return session.user;
}

// ─── Enrollment Actions ───

export async function approveEnrollment(
  enrollmentId: string,
  courseId: string,
  instituteCode: string
) {
  const user = await ensureCourseAccess(courseId);

  const result = await enrollmentManager({
    enrollmentIds: [enrollmentId],
    action: "approve",
    courseId,
    actorId: user.id,
  });

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return result;
}

export async function declineEnrollment(
  enrollmentId: string,
  courseId: string,
  instituteCode: string
) {
  const user = await ensureCourseAccess(courseId);

  const result = await enrollmentManager({
    enrollmentIds: [enrollmentId],
    action: "decline",
    courseId,
    actorId: user.id,
  });

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return result;
}

export async function approveAllPending(
  courseId: string,
  instituteCode: string
) {
  const user = await ensureCourseAccess(courseId);

  const result = await enrollmentManager({
    enrollmentIds: [],
    action: "auto-process",
    courseId,
    actorId: user.id,
  });

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return result;
}

// ─── Private Comment Actions ───

export async function sendPrivateComment(
  courseId: string,
  recipientId: string,
  content: string,
  instituteCode: string
) {
  const user = await ensureCourseAccess(courseId);

  // Run sentiment analysis via agentic skill
  const sentimentResult = await flagSentiment(content);
  const sentiment = sentimentResult.success
    ? sentimentResult.data?.sentiment ?? null
    : null;

  await db.privateComment.create({
    data: {
      courseId,
      senderId: user.id,
      recipientId,
      content,
      sentiment: sentimentResult.data?.flagged ? sentiment : null,
    },
  });

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return { success: true };
}

export async function getPrivateComments(
  courseId: string,
  studentId: string
) {
  const session = await getSession();
  if (!session) return [];

  return db.privateComment.findMany({
    where: {
      courseId,
      OR: [
        { senderId: session.user.id, recipientId: studentId },
        { senderId: studentId, recipientId: session.user.id },
      ],
    },
    include: {
      sender: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── Student Group Actions ───

export async function createStudentGroup(
  courseId: string,
  groupName: string,
  studentIds: string[],
  instituteCode: string
) {
  await ensureCourseAccess(courseId);

  const group = await db.studentGroup.create({
    data: {
      courseId,
      groupName,
      members: {
        create: studentIds.map((studentId) => ({ studentId })),
      },
    },
  });

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return { success: true, groupId: group.id };
}

export async function updateStudentGroup(
  groupId: string,
  courseId: string,
  groupName: string,
  studentIds: string[],
  instituteCode: string
) {
  await ensureCourseAccess(courseId);

  // Replace all members atomically
  await db.$transaction([
    db.studentGroupMember.deleteMany({ where: { groupId } }),
    db.studentGroup.update({
      where: { id: groupId },
      data: {
        groupName,
        members: {
          create: studentIds.map((studentId) => ({ studentId })),
        },
      },
    }),
  ]);

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return { success: true };
}

export async function deleteStudentGroup(
  groupId: string,
  courseId: string,
  instituteCode: string
) {
  await ensureCourseAccess(courseId);

  await db.studentGroup.delete({ where: { id: groupId } });

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return { success: true };
}
