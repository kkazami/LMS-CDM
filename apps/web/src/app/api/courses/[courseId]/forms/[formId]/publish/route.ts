import { createHash } from 'node:crypto';
import { lockFormForWrite } from '@/lib/forms/mutations';
import { publicForm } from '@/lib/forms/availability';
import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import { validateFormForPublish } from "@/lib/forms/form-validator";

import type { FormData, FormQuestionData } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string; formId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/[formId]/publish/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const role = canonicalRole(session.user.role);
    if (role !== "INSTRUCTOR" && role !== "ADMIN") {
      return NextResponse.json({ message: "Instructors only." }, { status: 403 });
    }

    const { courseId, formId } = await context.params;
    await requireFormAccess(session.user, courseId, formId, true);
    const updated = await db.$transaction(async tx => {
      await lockFormForWrite(tx, session.user, courseId, formId);
      const form = await tx.form.findUniqueOrThrow({ where: { id: formId }, include: { questions: { orderBy: { position: 'asc' } } } });
      const questions = form.questions.map(q => {
        let config = {}; try { config = JSON.parse(q.config || '{}'); } catch {}
        return { ...q, questionType: q.questionType as FormQuestionData['questionType'], config };
      });
      const validation = validateFormForPublish({ ...form, questions } as FormData);
      if (!validation.isValid) throw new AccessError(400, validation.errors.join('\n'));
      if (form.closesAt && form.closesAt <= new Date()) throw new AccessError(400, 'The due date has passed. Choose a future due date in Settings before publishing.');
      const totalPoints = form.questions.filter(q => q.questionType !== 'SECTION_HEADER').reduce((sum, q) => sum + q.points, 0);
      const saved = await tx.form.update({ where: { id: formId }, data: { status: 'PUBLISHED', totalPoints } });
      await tx.syllabusItem.update({ where: { id: form.syllabusItemId }, data: { maxPoints: Math.round(totalPoints), type: form.formType } });
      if (form.status !== 'PUBLISHED') {
        const item = await tx.syllabusItem.findUniqueOrThrow({ where: { id: form.syllabusItemId }, select: { targetGroups: { select: { group: { select: { members: { select: { studentId: true } } } } } } } });
        const targeted = new Set(item.targetGroups.flatMap(target => target.group.members.map(member => member.studentId)));
        const enrollments = await tx.enrollment.findMany({ where: { courseId, status: 'APPROVED', ...(item.targetGroups.length ? { studentId: { in: [...targeted] } } : {}) }, select: { studentId: true } });
        const scheduled = form.opensAt && form.opensAt > new Date();
        const kind = form.formType.toLowerCase().replaceAll('_', ' ');
        const start = scheduled ? form.opensAt!.toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }) + ' (PH time)' : '';
        await tx.notification.createMany({ data: enrollments.map(({ studentId }) => ({
          id: 'form-published-' + createHash('sha256').update(JSON.stringify([formId, studentId])).digest('hex'),
          userId: studentId, type: 'CLASSWORK', title: `${scheduled ? 'Scheduled' : 'New'} assessment: ${form.title}`,
          message: scheduled ? `This ${kind} opens on ${start}. Questions stay locked until then.` : `Your instructor published a ${kind}: ${form.title}.`,
          link: `/${session.user.institute.code.toLowerCase()}/courses/${courseId}/classwork/forms/${formId}`,
        })), skipDuplicates: true });
      }
      return saved;
    });

    return NextResponse.json({
      success: true,
      status: "PUBLISHED",
      totalPoints: updated.totalPoints,
      form: publicForm(updated),
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORM_PUBLISH_ERROR", error);
    return NextResponse.json({ message: "Failed to publish form." }, { status: 500 });
  }
}
