import { academicProvenance } from '@/lib/labs/readiness';
import { parseFormSettings, checkFormSchedule } from '@/lib/forms/settings';
import { visibleSyllabusForms } from '@/lib/forms/visibility';
import { publicForm, visibleForms } from '@/lib/forms/availability';
import { requireFormAccess } from '@/lib/forms/access';
import { accountErrorResponse, AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/api-auth";
import type { FormType } from "@/types/forms";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ courseId: string }>;
}

/**
 * GET /api/courses/[courseId]/forms
 * Lists all forms in a course.
 */
export async function GET(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "GET courses/[courseId]/forms/route.ts");
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    const { courseId } = await context.params;
    await requireFormAccess(session.user, courseId, undefined, false);
    const role = canonicalRole(session.user.role);
    const isInstructor = role === "INSTRUCTOR" || role === "ADMIN";

    const forms = await db.form.findMany({
      where: {
        courseId,
        // Students only see published or closed forms
        ...(isInstructor ? {} : { ...visibleForms(), syllabusItem: await visibleSyllabusForms(undefined, session.user.id) }),
      },
      include: {
        _count: {
          select: {
            questions: true,
            attempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ forms: forms.map(publicForm) });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORMS_GET_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch forms." }, { status: 500 });
  }
}

/**
 * POST /api/courses/[courseId]/forms
 * Creates a new Form and its linked SyllabusItem.
 */
export async function POST(request: Request, context: RouteContext) {
  const ceilingDenial = await denyLegacyApi(request, "POST courses/[courseId]/forms/route.ts");
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

    const { courseId } = await context.params;
    await requireFormAccess(session.user, courseId, undefined, true);
    const course = await db.course.findUnique({
      where: { id: courseId },
      select: { id: true, instructorId: true },
    });

    if (!course) {
      return NextResponse.json({ message: "Course not found." }, { status: 404 });
    }

    if (role !== "ADMIN" && course.instructorId !== session.user.id) {
      return NextResponse.json({ message: "You are not the instructor for this course." }, { status: 403 });
    }

    const body = parseFormSettings(await request.json());
    checkFormSchedule(body);
    const {
      title,
      description = "",
      formType = "QUIZ",
      timeLimitMins,
      maxAttempts = 1,
      scoreToKeep = "HIGHEST",
      shuffleQuestions = false,
      shuffleOptions = false,
      showScoreAfter = true,
      showAnswersAfter = false,
      showFeedbackAfter = false,
      isProctored = false,
      disableCopyPaste = false,
      detectTabSwitch = false,
      lockBrowser = false,
      themeColor,
      headerImageUrl,
      confirmationMessage,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ message: "Form title is required." }, { status: 400 });
    }

    // Determine SyllabusItem type from formType
    const syllabusType = formType.toUpperCase();

    // Create in a transaction
    const result = await db.$transaction(async (tx) => {
      const lastItem = await tx.syllabusItem.findFirst({
        where: { courseId },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });

      // Backing SyllabusItem
      const syllabusItem = await tx.syllabusItem.create({
        data: {
          courseId,
          type: syllabusType,
          ...await academicProvenance('UNTOUCHED', tx),
          title: title.trim(),
          description: description.trim(),
          dueDate: body.closesAt,
          orderIndex: (lastItem?.orderIndex ?? -1) + 1,
          enableIntegrityMonitoring: isProctored || detectTabSwitch,
          requireFullscreen: lockBrowser,
        },
      });

      // Form record
      const form = await tx.form.create({
        data: {
          courseId,
          syllabusItemId: syllabusItem.id,
          createdBy: session.user.id,
          title: title.trim(),
          description: description.trim(),
          formType: syllabusType as FormType,
          status: "DRAFT",
          opensAt: body.opensAt, closesAt: body.closesAt,
          timeLimitMins: timeLimitMins ? Number(timeLimitMins) : null,
          maxAttempts: Math.max(1, Number(maxAttempts) || 1),
          scoreToKeep,
          shuffleQuestions: Boolean(shuffleQuestions),
          shuffleOptions: Boolean(shuffleOptions),
          showScoreAfter: Boolean(showScoreAfter),
          showAnswersAfter: Boolean(showAnswersAfter),
          showFeedbackAfter: Boolean(showFeedbackAfter),
          isProctored: Boolean(isProctored),
          disableCopyPaste: Boolean(disableCopyPaste),
          detectTabSwitch: Boolean(detectTabSwitch),
          lockBrowser: Boolean(lockBrowser),
          themeColor: themeColor || null,
          headerImageUrl: headerImageUrl || null,
          confirmationMessage: confirmationMessage || null,
        },
      });

      // Create an initial default section
      const section = await tx.formSection.create({
        data: {
          formId: form.id,
          title: "Section 1",
          position: 0,
          pageNumber: 1,
        },
      });

      // Create a default initial multiple choice question
      await tx.formQuestion.create({
        data: {
          formId: form.id,
          sectionId: section.id,
          questionType: "MULTIPLE_CHOICE",
          prompt: "Untitled Question",
          position: 0,
          isRequired: true,
          points: 1,
          config: JSON.stringify({
            options: [
              { id: "opt_1", text: "Option 1", isCorrect: true },
              { id: "opt_2", text: "Option 2", isCorrect: false },
            ],
          }),
        },
      });

      return { form, syllabusItem };
    });

    return NextResponse.json({
      success: true,
      formId: result.form.id,
      syllabusItemId: result.syllabusItem.id,
    });
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    console.error("FORMS_POST_ERROR", error);
    return NextResponse.json({ message: "Failed to create form." }, { status: 500 });
  }
}
