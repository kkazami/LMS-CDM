import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import FormBuilder from "@/components/forms/builder/FormBuilder";
import type { FormData, FormQuestionData } from "@/types/forms";

interface PageProps {
  params: Promise<{
    institute: string;
    courseId: string;
    formId: string;
  }>;
}

export default async function FormBuilderPage({ params }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/forms/[formId]/builder/page.tsx");

  const { institute, courseId, formId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string).toUpperCase();
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
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

  // Parse JSON configs
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
    ...form,
    formType: form.formType as FormData["formType"],
    status: form.status as FormData["status"],
    scoreToKeep: form.scoreToKeep as FormData["scoreToKeep"],
    hasPassword: Boolean(form.passwordHash),
    questions: parsedQuestions,
  };

  return (
    <FormBuilder
      initialForm={parsedForm}
      courseId={courseId}
      instituteCode={institute}
      theme={theme}
    />
  );
}
