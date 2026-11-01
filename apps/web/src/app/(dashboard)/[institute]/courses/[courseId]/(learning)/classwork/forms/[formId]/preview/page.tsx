import { requireFormAccess } from '@/lib/forms/access';
import { publicForm } from '@/lib/forms/availability';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import FormRenderer from "@/components/forms/renderer/FormRenderer";
import type { FormData, FormQuestionData, FormAttemptData } from "@/types/forms";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
    formId: string;
  }>;
}

export default async function FormPreviewPage({ params }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/forms/[formId]/preview/page.tsx", await params);

  const { institute, courseId, formId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  try { await requireFormAccess(session.user, courseId, formId, true); } catch { redirect(`/${institute}/courses/${courseId}/classwork`); }
  const role = canonicalRole(session.user.role);
  if (role !== "INSTRUCTOR" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const form = await db.form.findUnique({
    where: { id: formId },
    include: {
      sections: { orderBy: { position: "asc" } },
      questions: { orderBy: { position: "asc" } },
    },
  });

  if (!form || form.courseId !== courseId) {
    redirect(`/${institute}/courses/${courseId}/classwork`);
  }

  const theme = getInstituteTheme(institute);

  const parsedQuestions: FormQuestionData[] = form.questions.map((q) => {
    let cfg = {};
    try {
      cfg = JSON.parse(q.config || "{}");
    } catch {}

    return {
      ...q,
      questionType: q.questionType as FormQuestionData["questionType"],
      config: cfg,
    };
  });

  const parsedForm: FormData = {
    ...publicForm(form),
    formType: form.formType as FormData["formType"],
    status: form.status as FormData["status"],
    scoreToKeep: form.scoreToKeep as FormData["scoreToKeep"],
    questions: parsedQuestions,
  };

  const previewAttempt: FormAttemptData = {
    id: `preview_${form.id}`,
    formId: form.id,
    userId: session.user.id,
    attemptNumber: 1,
    status: "IN_PROGRESS",
    startedAt: new Date(),
    deadlineAt: form.timeLimitMins
      ? new Date(Date.now() + form.timeLimitMins * 60 * 1000)
      : null,
    syncedToGradebook: false,
    tabSwitchCount: 0,
    copyPasteCount: 0,
    answers: [],
  };

  return (
    <div className="relative">
      <div className="sticky top-0 z-50 bg-amber-500 text-white text-xs font-semibold py-2.5 px-4 sm:px-8 shadow-md flex items-center justify-between gap-4">
        <a
          href={`/${institute}/courses/${courseId}/classwork/forms/${formId}/builder`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-white font-bold transition-all shadow-xs"
        >
          <span aria-hidden="true">&larr;</span>
          <span>Back to Builder</span>
        </a>
        <span className="text-center font-bold flex-1 truncate">
          ⚠️ Preview Mode — responses in preview mode will not affect course grades or records.
        </span>
        <a
          href={`/${institute}/courses/${courseId}/classwork`}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/15 hover:bg-black/25 text-white transition-all font-medium"
        >
          <span>Classwork</span>
        </a>
      </div>
      <FormRenderer
        form={parsedForm}
        attempt={previewAttempt}
        courseId={courseId}
        instituteCode={institute}
        studentName={`${session.user.name} (Instructor Preview)`}
        studentEmail={session.user.email}
        theme={theme}
        isPreview={true}
      />
    </div>
  );
}
