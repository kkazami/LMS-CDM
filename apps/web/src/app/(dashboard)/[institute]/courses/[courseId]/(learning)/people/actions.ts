"use server";
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';


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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#approveEnrollment", () => ({ institute: instituteCode, courseId }));

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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#declineEnrollment", () => ({ institute: instituteCode, courseId }));

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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#approveAllPending", () => ({ institute: instituteCode, courseId }));

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

import { grantExp } from "@/lib/gamification/grant-exp";
import { EXP_VALUES, DAILY_EXP_CAPS } from "@/lib/gamification/exp-engine";
import { awardBadgeIfEarned } from "@/lib/gamification/badge-checker";
import { evaluatePrivateCommentAccess } from "@/lib/ite/people-drawer-rules";

// ─── Private Comment Actions ───

async function ensurePrivateCommentAccess(
  courseId: string,
  targetUserId: string
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (typeof courseId !== "string" || !courseId.trim() || courseId.length > 100) {
    throw new Error("Invalid course ID");
  }
  if (typeof targetUserId !== "string" || !targetUserId.trim() || targetUserId.length > 100) {
    throw new Error("Invalid target user ID");
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      instructorId: true,
      isArchived: true,
      institute: { select: { code: true } },
    },
  });

  if (!course) throw new Error("Course not found");

  let enrollmentStatus: string | null = null;
  const role = session.user.role.toUpperCase();
  if (role === "STUDENT") {
    const enrollment = await db.enrollment.findFirst({
      where: {
        courseId,
        studentId: session.user.id,
      },
      select: { status: true },
    });
    enrollmentStatus = enrollment?.status ?? null;
  }

  const access = evaluatePrivateCommentAccess({
    userId: session.user.id,
    userRole: session.user.role,
    targetUserId,
    course: {
      id: course.id,
      instructorId: course.instructorId,
      isArchived: course.isArchived,
      instituteCode: course.institute?.code,
    },
    enrollmentStatus,
  });

  if (!access.allowed) {
    throw new Error(`Unauthorized: ${access.reason || "Access denied"}`);
  }

  return session.user;
}

export async function sendPrivateComment(
  courseId: string,
  recipientId: string,
  content: string,
  instituteCode: string
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#sendPrivateComment", () => ({ institute: instituteCode, courseId, recipientId }));

  const user = await ensurePrivateCommentAccess(courseId, recipientId);
  const isStudent = user.role.toUpperCase() === "STUDENT";

  let finalContent = content;
  if (isStudent) {
    if (typeof content !== "string") {
      throw new Error("Invalid comment content");
    }
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error("Comment content cannot be empty");
    }
    if (trimmed.length > 4000) {
      throw new Error("Comment exceeds maximum allowed length (4,000 characters)");
    }
    finalContent = trimmed;
  }

  // Run sentiment analysis via agentic skill
  const sentimentResult = await flagSentiment(finalContent);
  const sentiment = sentimentResult.success
    ? sentimentResult.data?.sentiment ?? null
    : null;

  await db.privateComment.create({
    data: {
      courseId,
      senderId: user.id,
      recipientId,
      content: finalContent,
      sentiment: sentimentResult.data?.flagged ? sentiment : null,
    },
  });

  // Grant EXP for constructive participation (≥15 characters, max 25 EXP/day)
  if (finalContent.trim().length >= 15 && isStudent) {
    try {
      await grantExp({
        userId: user.id,
        amount: EXP_VALUES.discussion_post,
        reason: "Course communication & discussion",
        source: "discussion",
        courseId,
        dailyCap: DAILY_EXP_CAPS.discussion,
      });
      await awardBadgeIfEarned(user.id, "discussion-first");
    } catch (gamiErr) {
      console.error("GAMIFICATION_DISCUSSION_ERROR", gamiErr);
    }
  }

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return { success: true };
}

export async function getPrivateComments(
  courseId: string,
  studentId: string,
  _instituteCode?: string
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#getPrivateComments", () => ({ courseId, studentId }));

  const session = await getSession();
  if (!session) return [];

  // Enforce the same authorization on reading comments
  try {
    await ensurePrivateCommentAccess(courseId, studentId);
  } catch {
    return [];
  }

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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#createStudentGroup", () => ({ institute: instituteCode, courseId, studentIds }));

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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#updateStudentGroup", () => ({ institute: instituteCode, courseId, groupId, studentIds }));

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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/people/actions.ts#deleteStudentGroup", () => ({ institute: instituteCode, courseId, groupId }));

  await ensureCourseAccess(courseId);

  await db.studentGroup.delete({ where: { id: groupId } });

  revalidatePath(`/(dashboard)/${instituteCode}/courses/${courseId}/people`);
  return { success: true };
}
