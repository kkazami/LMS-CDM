"use server";
import { academicProvenance } from '@/lib/labs/readiness';
import { assertOrdinaryClasswork } from '@/lib/academic-task';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';


import { z } from "zod";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth-session";
import { createNotificationsForCourseStudents } from "@/lib/notifications";
import { requireOwnedUpload } from '@/lib/private-upload';
import { attachmentLocation } from '@/lib/academic-records';
import { courseworkSettingsError } from '@/lib/coursework-submission';
import { requireCourseAccess } from '@/lib/course-access';
import { AccessError } from '@/lib/super-user-v1/actor';

async function validateUploads(actor: Awaited<ReturnType<typeof ensureCourseInstructor>>, raw: string) {
  const files = z.array(z.object({ url: attachmentLocation })).max(20).parse(JSON.parse(raw));
  for (const file of files) await requireOwnedUpload(db, actor, file.url);
}

async function ensureCourseInstructor(courseId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  await requireCourseAccess(session.user, courseId, true);

  return session.user;
}

const syllabusItemSchema = z.object({
  id: z.string().optional(),
  courseId: z.string(),
  type: z.string().min(1, "Type is required."),
  isProgramming: z.boolean().default(false),
  requireGithubRepo: z.boolean().default(false),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional().default(""),
  dueDate: z.string().optional().nullable(),
  maxPoints: z.string().optional().nullable(),
  enableIntegrityMonitoring: z.boolean().optional().default(false),
  requireFullscreen: z.boolean().optional().default(false),
  targetGroupIds: z.string().optional().default(""),
  attachments: z.string().optional().default("[]"), // JSON array of {type, url, fileName}
  instituteCode: z.string(),
}).superRefine((data, ctx) => {
  const error = courseworkSettingsError(data);
  if (error) ctx.addIssue({ code: 'custom', path: ['requireGithubRepo'], message: error });
});

function parseCombinedDueDateTime(dateVal: FormDataEntryValue | null, timeVal: FormDataEntryValue | null): string | null {
  if (!dateVal || typeof dateVal !== "string" || !dateVal.trim()) return null;
  const time = typeof timeVal === "string" && timeVal.trim() ? timeVal.trim() : "23:59";
  if (dateVal.includes("T")) return dateVal;
  return `${dateVal}T${time.length === 5 ? `${time}:00` : time}`;
}

export async function createSyllabusItem(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/actions.ts#createSyllabusItem", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('courseId') ?? '') }));

  const parse = syllabusItemSchema.safeParse({
    courseId: formData.get("courseId"),
    type: formData.get("type"),
    isProgramming: formData.get("isProgramming") === "true",
    requireGithubRepo: formData.get("requireGithubRepo") === "true",
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueDate: parseCombinedDueDateTime(formData.get("dueDate"), formData.get("dueTime")),
    maxPoints: formData.get("maxPoints") || null,
    enableIntegrityMonitoring: formData.get("enableIntegrityMonitoring") === "true" || formData.get("enableIntegrityMonitoring") === "on",
    requireFullscreen: formData.get("requireFullscreen") === "true" || formData.get("requireFullscreen") === "on",
    targetGroupIds: formData.get("targetGroupIds") || "",
    attachments: formData.get("attachments") || "[]",
    instituteCode: formData.get("instituteCode"),
  });

  const leaderboardEnabled = formData.get("leaderboardEnabled") === "true";
  const rewardTiersRaw = formData.get("rewardTiers") as string || "[]";
  const rewardTiers = JSON.parse(rewardTiersRaw) as { placement: number; rewardLabel: string; bonusExp: number }[];

  if (!parse.success) {
    return {
      errors: parse.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const data = parse.data;

  try {
    await validateUploads(await ensureCourseInstructor(data.courseId), data.attachments);

    const syllabusItem = await db.$transaction(async tx => {
      // Get the next order index
      const lastItem = await tx.syllabusItem.findFirst({
        where: { courseId: data.courseId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });

      const item = await tx.course.findUnique({
        where: { id: data.courseId },
        select: { id: true },
      });

      if (!item) throw new Error("Course not found.");

      const syllabusItem = await tx.syllabusItem.create({
        data: {
          courseId: data.courseId,
          ...await academicProvenance('UNTOUCHED', tx),
          type: data.type,
          isProgramming: data.isProgramming,
          requireGithubRepo: data.requireGithubRepo,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          maxPoints: data.maxPoints ? parseInt(data.maxPoints, 10) : null,
          enableIntegrityMonitoring: data.enableIntegrityMonitoring,
          requireFullscreen: data.requireFullscreen,
          orderIndex: (lastItem?.orderIndex ?? -1) + 1,
          leaderboardEnabled,
        },
      });

      if (rewardTiers.length > 0) {
        await tx.leaderboardReward.createMany({
          data: rewardTiers.map((tier) => ({
            syllabusItemId: syllabusItem.id,
            placement: tier.placement,
            rewardLabel: tier.rewardLabel,
            bonusExp: tier.bonusExp || 0,
          })),
        });
      }

      // Handle target groups
      if (data.targetGroupIds) {
        const groupIds = data.targetGroupIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

        if (groupIds.length > 0) {
          await tx.syllabusTargetGroup.createMany({
            data: groupIds.map((groupId) => ({
              syllabusItemId: syllabusItem.id,
              groupId,
            })),
          });
        }
      }

      // Handle attachments
      try {
        const attachmentList = JSON.parse(data.attachments || "[]") as Array<{
          type: string;
          url: string;
          fileName?: string;
        }>;
        if (attachmentList.length > 0) {
          await tx.attachment.createMany({
            data: attachmentList.map((a) => ({
              syllabusItemId: syllabusItem.id,
              type: a.type || "FILE",
              url: a.url,
              fileName: a.fileName || "",
            })),
          });
        }
      } catch {
        // Invalid JSON — skip attachments silently
      }

      return syllabusItem;
    });

    // ── Notify enrolled students about new classwork (ASSIGNMENT/QUIZ only) ──
    const itemType = data.type.toUpperCase();
    if (itemType === "ASSIGNMENT" || itemType === "QUIZ") {
      // Fetch course code for notification message
      const courseInfo = await db.course.findUnique({
        where: { id: data.courseId },
        select: { code: true },
      });
      const typeLabel = itemType === "QUIZ" ? "quiz" : "assignment";
      await createNotificationsForCourseStudents(data.courseId, {
        type: "CLASSWORK",
        title: `New ${typeLabel} posted`,
        message: `New ${typeLabel} in ${courseInfo?.code || "your class"}: ${data.title}`,
        link: `/${data.instituteCode}/courses/${data.courseId}/classwork`,
      });
    }

    revalidatePath(
      `/(dashboard)/${data.instituteCode}/courses/${data.courseId}/classwork`
    );
    return { message: "success" };
  } catch (error) {
    if (!(error instanceof AccessError)) console.warn('CLASSWORK_CREATE_UNAVAILABLE');
    return { message: error instanceof AccessError ? error.message : "Failed to create item." };
  }
}

export async function updateSyllabusItem(
  prevState: { message: string; errors?: Record<string, string[]> },
  formData: FormData
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/actions.ts#updateSyllabusItem", () => ({ institute: String(formData.get('instituteCode') ?? ''), courseId: String(formData.get('courseId') ?? ''), syllabusItemId: String(formData.get('id') ?? '') }));

  const parse = syllabusItemSchema.safeParse({
    id: formData.get("id"),
    courseId: formData.get("courseId"),
    type: formData.get("type"),
    isProgramming: formData.get("isProgramming") === "true",
    requireGithubRepo: formData.get("requireGithubRepo") === "true",
    title: formData.get("title"),
    description: formData.get("description") || "",
    dueDate: parseCombinedDueDateTime(formData.get("dueDate"), formData.get("dueTime")),
    maxPoints: formData.get("maxPoints") || null,
    enableIntegrityMonitoring: formData.get("enableIntegrityMonitoring") === "true" || formData.get("enableIntegrityMonitoring") === "on",
    requireFullscreen: formData.get("requireFullscreen") === "true" || formData.get("requireFullscreen") === "on",
    targetGroupIds: formData.get("targetGroupIds") || "",
    attachments: formData.get("attachments") || "[]",
    instituteCode: formData.get("instituteCode"),
  });

  const leaderboardEnabled = formData.get("leaderboardEnabled") === "true";
  const rewardTiersRaw = formData.get("rewardTiers") as string || "[]";
  const rewardTiers = JSON.parse(rewardTiersRaw) as { placement: number; rewardLabel: string; bonusExp: number }[];

  if (!parse.success) {
    return {
      errors: parse.error.flatten().fieldErrors,
      message: "Validation failed.",
    };
  }

  const data = parse.data;
  const itemId = formData.get("id") as string;

  if (!itemId) return { message: "Item ID is required." };

  try {
    await validateUploads(await ensureCourseInstructor(data.courseId), data.attachments);

    await db.$transaction(async tx => {
      await assertOrdinaryClasswork(tx, itemId);
      const current = await tx.syllabusItem.findFirst({ where: { id: itemId, courseId: data.courseId }, include: { form: { select: { id: true } } } });
      if (!current) throw new AccessError(404, 'Classwork not found.');
      if (data.requireGithubRepo && (current.form || await tx.activityTemplate.count({ where: { syllabusItemId: itemId } }))) throw new AccessError(409, 'Interactive assessments use their own submission flow. Create separate coursework for a GitHub repository.');
      if (current.requireGithubRepo !== data.requireGithubRepo && await tx.studentSubmission.count({ where: { syllabusItemId: itemId, OR: [{ attachments: { some: {} } }, { status: { not: 'DRAFT' } }, { grade: { not: null } }, { isReturned: true }] } })) {
        throw new AccessError(409, 'The submission requirement cannot change after students have added work. Create new coursework for a different submission requirement.');
      }
      await tx.syllabusItem.update({
        where: { id: itemId, courseId: data.courseId },
        data: {
          type: data.type,
          isProgramming: data.isProgramming,
          requireGithubRepo: data.requireGithubRepo,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          maxPoints: data.maxPoints ? parseInt(data.maxPoints, 10) : null,
          enableIntegrityMonitoring: data.enableIntegrityMonitoring,
          requireFullscreen: data.requireFullscreen,
          leaderboardEnabled,
        },
      });

      await tx.leaderboardReward.deleteMany({ where: { syllabusItemId: itemId } });
      if (rewardTiers.length > 0) {
        await tx.leaderboardReward.createMany({
          data: rewardTiers.map((tier) => ({
            syllabusItemId: itemId,
            placement: tier.placement,
            rewardLabel: tier.rewardLabel,
            bonusExp: tier.bonusExp || 0,
          })),
        });
      }

      // Replace target groups
      await tx.syllabusTargetGroup.deleteMany({
        where: { syllabusItemId: itemId },
      });

      if (data.targetGroupIds) {
        const groupIds = data.targetGroupIds
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean);

        if (groupIds.length > 0) {
          await tx.syllabusTargetGroup.createMany({
            data: groupIds.map((groupId) => ({
              syllabusItemId: itemId,
              groupId,
            })),
          });
        }
      }

      // Replace attachments
      await tx.attachment.deleteMany({ where: { syllabusItemId: itemId } });
      try {
        const attachmentList = JSON.parse(data.attachments || "[]") as Array<{
          type: string;
          url: string;
          fileName?: string;
        }>;
        if (attachmentList.length > 0) {
          await tx.attachment.createMany({
            data: attachmentList.map((a) => ({
              syllabusItemId: itemId,
              type: a.type || "FILE",
              url: a.url,
              fileName: a.fileName || "",
            })),
          });
        }
      } catch {
        // Invalid JSON — skip
      }

    });

    revalidatePath(
      `/(dashboard)/${data.instituteCode}/courses/${data.courseId}/classwork`
    );
    return { message: "success" };
  } catch (error) {
    if (!(error instanceof AccessError)) console.warn('CLASSWORK_UPDATE_UNAVAILABLE');
    return { message: error instanceof AccessError ? error.message : "Failed to update item." };
  }
}

export async function deleteSyllabusItem(
  itemId: string,
  courseId: string,
  instituteCode: string
) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/actions.ts#deleteSyllabusItem", () => ({ institute: instituteCode, courseId, itemId }));

  try {
    await ensureCourseInstructor(courseId);

    await db.$transaction(async tx => {
      await assertOrdinaryClasswork(tx, itemId);
      if (await tx.formAttempt.count({ where: { form: { syllabusItemId: itemId, courseId } } })) throw new Error('Students have started this assessment. Close the form instead to preserve their work and grades.');
      await tx.syllabusItem.delete({ where: { id: itemId, courseId } });
    });

    revalidatePath(
      `/(dashboard)/${instituteCode}/courses/${courseId}/classwork`
    );
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete item.",
    };
  }
}
