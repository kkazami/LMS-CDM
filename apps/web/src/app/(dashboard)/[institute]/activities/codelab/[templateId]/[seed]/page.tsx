/**
 * Student CodeLab Execution Route
 * Route: /[institute]/activities/codelab/[templateId]/[seed]
 */

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import CodeLabScene from "@/features/interactive-activities/codelab/components/CodeLabScene";
import { evaluateVariables, substituteTemplate } from "@/features/interactive-activities/codelab/utils/problem-engine";
import { TestCase } from "@/features/interactive-activities/codelab/stores/codelab-store";

export default async function CodeLabActivityPage({
  params,
}: {
  params: Promise<{ institute: string; templateId: string; seed: string }>;
}) {
  const { templateId, seed } = await params;
  const session = await getSession();

  if (!session) throw new Error("Unauthorized");

  const template = await db.activityTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || template.activityType !== "codelab") {
    notFound();
  }

  const variablesObj = JSON.parse(template.variables as string || "{}");
  const hiddenTestCasesRaw = JSON.parse(template.hiddenTestCases as string || "[]");
  
  const descriptionTemplate = variablesObj.descriptionTemplate || "";
  const variablesConfig = variablesObj.variablesConfig || [];
  const signatureConfig = variablesObj.signatureConfig || { name: "main", returnType: "void", params: [] };
  const publicTestCasesRaw = variablesObj.publicTestCases || [];

  // Evaluate variables deterministic based on seed
  const evaluatedVars = evaluateVariables(seed, variablesConfig);
  
  // Substitute into description
  const finalDescription = substituteTemplate(descriptionTemplate, evaluatedVars);

  // Compile test cases
  const testCases: TestCase[] = [
    ...publicTestCasesRaw.map((tc: any) => ({
      input: substituteTemplate(tc.input, evaluatedVars),
      expectedOutput: substituteTemplate(tc.expectedOutput, evaluatedVars),
      isHidden: false
    })),
    ...hiddenTestCasesRaw.map((tc: any) => ({
      input: substituteTemplate(tc.input, evaluatedVars),
      expectedOutput: substituteTemplate(tc.expectedOutput, evaluatedVars),
      isHidden: true
    }))
  ];

  return (
    <div className="-m-4 lg:-m-8 flex flex-col w-full bg-[#0f172a] relative overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
      <CodeLabScene
        assignmentId={template.id}
        studentId={session.user.id}
        variantSeed={seed}
        startedAt={new Date().toISOString()}
        descriptionMarkdown={finalDescription}
        signature={signatureConfig}
        testCases={testCases}
      />
    </div>
  );
}
