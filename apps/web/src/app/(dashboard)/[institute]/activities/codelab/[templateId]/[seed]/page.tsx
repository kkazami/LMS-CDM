/**
 * Student CodeLab Execution Page
 * Route: /[institute]/activities/codelab/[templateId]/[seed]
 *
 * Resolves problem from PROBLEM_BANK (or DB fallback), calculates
 * deterministic variable replacements from the seed, evaluates public test
 * cases, and passes sanitized props to CodeLabScene.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isEligibleForActivities, isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { getProblemById } from "@/features/interactive-activities/codelab/problems";
import { evaluateVariables, substituteTemplate } from "@/features/interactive-activities/codelab/utils/problem-engine";
import CodeLabScene from "@/features/interactive-activities/codelab/components/CodeLabScene";
import { TestCase } from "@/features/interactive-activities/codelab/stores/codelab-store";
import { db } from "@/lib/db";

export default async function CodeLabProblemPage({
  params,
}: {
  params: Promise<{ institute: string; templateId: string; seed: string }>;
}) {
  const { institute, templateId, seed } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Enforce ICS-only feature guard
  const eligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role,
      instituteId: session.user.instituteId,
    },
  });

  if (!eligible || !isEligibleInstituteCode(institute)) {
    notFound();
  }

  // 2. Fetch latest submission to check if attempt was rejected/invalidated by instructor
  const latestSubmission = await db.activitySubmission.findFirst({
    where: {
      studentId: session.user.id,
      templateId: templateId,
    },
    orderBy: { submittedAt: "desc" },
    select: {
      id: true,
      score: true,
      stateCheck: true,
      submittedAt: true,
    },
  });

  let rejectionWarning: {
    isRejected: boolean;
    rejectionReason?: string;
    rejectedAt?: string;
  } | null = null;

  if (latestSubmission?.stateCheck) {
    try {
      const stateObj = JSON.parse(latestSubmission.stateCheck);
      if (stateObj.isRejected) {
        rejectionWarning = {
          isRejected: true,
          rejectionReason:
            typeof stateObj.rejectionReason === "string"
              ? stateObj.rejectionReason
              : "Attempt invalidated by instructor.",
          rejectedAt: stateObj.rejectedAt || latestSubmission.submittedAt.toISOString(),
        };
      }
    } catch {
      // ignore parse errors
    }
  }

  // 3. Lookup problem from static PROBLEM_BANK first
  const problem = getProblemById(templateId);

  if (problem) {
    const evaluatedVars = evaluateVariables(seed, problem.variables);
    const finalDescription = substituteTemplate(problem.descriptionTemplate, evaluatedVars);

    // Only pass public test cases to client (hidden ones are kept server-side)
    const publicTestCases: TestCase[] = problem.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({
        input: substituteTemplate(tc.inputTemplate, evaluatedVars),
        expectedOutput: problem.computeExpectedOutput(evaluatedVars, tc),
        isHidden: false,
      }));

    return (
      <div
        className="-m-4 lg:-m-8 flex flex-col w-full bg-slate-950 relative overflow-hidden"
        style={{ height: "calc(100vh - 73px)" }}
      >
        <CodeLabScene
          assignmentId={problem.id}
          studentId={session.user.id}
          variantSeed={seed}
          startedAt={new Date().toISOString()}
          descriptionMarkdown={finalDescription}
          signature={{
            name: "solution",
            returnType: "void",
            params: [],
          }}
          publicTestCases={publicTestCases}
          templateTitle={problem.title}
          level={problem.level}
          tags={problem.tags}
          hintTemplate={problem.hintTemplate}
          institute={institute}
          rejectionWarning={rejectionWarning}
        />
      </div>
    );
  }

  // 3. Fallback to DB activity template if customized by an instructor
  const template = await db.activityTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || template.activityType !== "codelab") {
    notFound();
  }

  const variablesObj = JSON.parse((template.variables as string) || "{}");
  const descriptionTemplate = variablesObj.descriptionTemplate || "";
  const variablesConfig = variablesObj.variablesConfig || [];
  const signatureConfig = variablesObj.signatureConfig || { name: "main", returnType: "void", params: [] };
  const publicTestCasesRaw = variablesObj.publicTestCases || [];

  const evaluatedVars = evaluateVariables(seed, variablesConfig);
  const finalDescription = substituteTemplate(descriptionTemplate, evaluatedVars);

  const publicTestCases: TestCase[] = publicTestCasesRaw.map((tc: { input: string; expectedOutput: string }) => ({
    input: substituteTemplate(tc.input, evaluatedVars),
    expectedOutput: substituteTemplate(tc.expectedOutput, evaluatedVars),
    isHidden: false,
  }));

  return (
    <div
      className="-m-4 lg:-m-8 flex flex-col w-full bg-slate-950 relative overflow-hidden"
      style={{ height: "calc(100vh - 73px)" }}
    >
      <CodeLabScene
        assignmentId={template.id}
        studentId={session.user.id}
        variantSeed={seed}
        startedAt={new Date().toISOString()}
        descriptionMarkdown={finalDescription}
        signature={signatureConfig}
        publicTestCases={publicTestCases}
        templateTitle={template.title}
        institute={institute}
        rejectionWarning={rejectionWarning}
      />
    </div>
  );
}
