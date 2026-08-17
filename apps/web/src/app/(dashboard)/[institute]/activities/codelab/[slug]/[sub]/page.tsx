/**
 * Unified CodeLab Problem / Level Execution Page
 * Route: /[institute]/activities/codelab/[slug]/[sub]
 *
 * Handles both:
 * 1. Track Level Execution: /[institute]/activities/codelab/[language]/[level] (e.g. /python/1)
 * 2. Template / Seed Execution: /[institute]/activities/codelab/[templateId]/[seed] (e.g. /py-1/seed-123 or /[templateId]/weekly)
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isEligibleForActivities, isEligibleInstituteCode } from "@/lib/activity-eligibility";
import {
  ProblemLanguage,
  ProblemLevel,
  isLevelUnlocked,
} from "@/features/interactive-activities/codelab/problems/types";
import {
  getProblemById,
  getProblemByLanguageAndLevel,
} from "@/features/interactive-activities/codelab/problems";
import {
  evaluateVariables,
  substituteTemplate,
} from "@/features/interactive-activities/codelab/utils/problem-engine";
import CodeLabScene from "@/features/interactive-activities/codelab/components/CodeLabScene";
import { TestCase } from "@/features/interactive-activities/codelab/stores/codelab-store";
import { db } from "@/lib/db";

interface CodeLabDynamicPageProps {
  params: Promise<{ institute: string; slug: string; sub: string }>;
}

const VALID_LANGUAGES = new Set<ProblemLanguage>([
  "python",
  "cpp",
  "csharp",
  "java",
  "javascript",
  "sql",
  "html",
  "css",
]);

export default async function CodeLabDynamicExecutionPage({ params }: CodeLabDynamicPageProps) {
  const { institute, slug, sub } = await params;
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

  const lowerSlug = slug.toLowerCase() as ProblemLanguage;
  const levelNumber = parseInt(sub, 10) as ProblemLevel;

  // ─── Mode A: Language Track Level (e.g. /codelab/python/1) ───
  if (VALID_LANGUAGES.has(lowerSlug) && !isNaN(levelNumber) && levelNumber >= 1 && levelNumber <= 30) {
    const submissions = await db.activitySubmission.findMany({
      where: {
        studentId: session.user.id,
        activityType: "codelab",
      },
      select: {
        score: true,
        stateCheck: true,
        templateId: true,
      },
    });

    const scores: Record<number, number> = {};
    for (const item of submissions) {
      if (!item.stateCheck) continue;
      try {
        const state = JSON.parse(item.stateCheck) as Record<string, unknown>;
        let lang = state.language as string | undefined;
        let lvl = Number(state.level);

        if (!lang && item.templateId) {
          const match = item.templateId.match(/^([a-z0-9]+)-level-(\d+)$/i);
          if (match) {
            lang = match[1].toLowerCase();
            lvl = parseInt(match[2], 10);
          }
        }

        if (lang === lowerSlug && !isNaN(lvl) && lvl >= 1 && lvl <= 30) {
          const existing = scores[lvl] ?? 0;
          scores[lvl] = Math.max(existing, item.score);
        }
      } catch {
        // ignore
      }
    }

    const highestPassed = Object.entries(scores)
      .filter(([, score]) => score >= 60)
      .map(([lvl]) => parseInt(lvl, 10))
      .reduce((max, lvl) => Math.max(max, lvl), 0);

    // Sequential Level Lock Check: Redirect if locked
    if (!isLevelUnlocked(levelNumber, highestPassed)) {
      redirect(`/${institute}/activities/codelab/${lowerSlug}`);
    }

    const problem = getProblemByLanguageAndLevel(lowerSlug, levelNumber);
    if (!problem) {
      notFound();
    }

    const variantSeed = `${session.user.id}-${problem.id}`;
    const evaluatedVars = evaluateVariables(variantSeed, problem.variables);
    const finalDescription = substituteTemplate(problem.descriptionTemplate, evaluatedVars);

    const publicTestCases: TestCase[] = problem.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({
        input: substituteTemplate(tc.inputTemplate, evaluatedVars),
        expectedOutput:
          problem.executionMethod === "judge0"
            ? problem.computeExpectedOutput(evaluatedVars, tc)
            : tc.expectedOutputTemplate,
        isHidden: false,
      }));

    return (
      <div
        className="-m-4 lg:-m-8 flex flex-col w-full bg-slate-950 relative overflow-hidden"
        style={{ height: "calc(100vh - 73px)" }}
      >
        <CodeLabScene
          key={`codelab-${problem.id}-${levelNumber}`}
          assignmentId={problem.id}
          studentId={session.user.id}
          variantSeed={variantSeed}
          startedAt={new Date().toISOString()}
          descriptionMarkdown={finalDescription}
          publicTestCases={publicTestCases}
          templateTitle={problem.title}
          level={problem.level}
          tags={problem.tags}
          hintTemplate={problem.hintTemplate}
          hints={problem.hints}
          institute={institute}
          fixedLanguage={problem.language}
          fixedLanguageId={problem.languageId}
          executionMethod={problem.executionMethod}
          htmlTemplate={problem.htmlTemplate}
        />
      </div>
    );
  }

  // ─── Mode B: Generic Template / Seed Execution (e.g. /codelab/py-1/seed-xyz or /[templateId]/weekly) ───
  const templateId = slug;
  const seed = sub;

  // Check if attempt was rejected by instructor
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
      // ignore
    }
  }

  // Check static problem bank
  const staticProblem = getProblemById(templateId);
  if (staticProblem) {
    const evaluatedVars = evaluateVariables(seed, staticProblem.variables);
    const finalDescription = substituteTemplate(staticProblem.descriptionTemplate, evaluatedVars);

    const publicTestCases: TestCase[] = staticProblem.testCases
      .filter((tc) => !tc.isHidden)
      .map((tc) => ({
        input: substituteTemplate(tc.inputTemplate, evaluatedVars),
        expectedOutput: staticProblem.computeExpectedOutput(evaluatedVars, tc),
        isHidden: false,
      }));

    return (
      <div
        className="-m-4 lg:-m-8 flex flex-col w-full bg-slate-950 relative overflow-hidden"
        style={{ height: "calc(100vh - 73px)" }}
      >
        <CodeLabScene
          assignmentId={staticProblem.id}
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
          templateTitle={staticProblem.title}
          level={staticProblem.level}
          tags={staticProblem.tags}
          hintTemplate={staticProblem.hintTemplate}
          institute={institute}
          rejectionWarning={rejectionWarning}
        />
      </div>
    );
  }

  // Fallback to database activity template
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
        key={`codelab-template-${template.id}-${seed}`}
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
