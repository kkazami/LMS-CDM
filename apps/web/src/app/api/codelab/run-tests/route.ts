/**
 * POST /api/codelab/run-tests
 *
 * Server-side test execution for CodeLab problems.
 * Runs student code against ALL test cases (public + hidden) on the server.
 * Returns full details for public test cases but only pass/fail for hidden ones.
 *
 * Security:
 *   - Requires valid session (401)
 *   - Requires ICS eligibility (403)
 *   - Hidden test cases never leave the server
 *   - All execution runs in Judge0 sandbox
 */

import { NextResponse } from "next/server";
import { checkActivityEligibility } from "@/lib/activity-eligibility";
import { db } from "@/lib/db";
import { substituteTemplate, evaluateVariables, CodeLabVariable } from "@/features/interactive-activities/codelab/utils/problem-engine";

import { executeJudge0Submission } from "@/features/interactive-activities/codelab/utils/judge0-config";

export const dynamic = "force-dynamic";

const MAX_SOURCE_CODE_BYTES = 64 * 1024;

interface RawTestCase {
  input: string;
  expectedOutput: string;
}

interface TestRunResult {
  index: number;
  passed: boolean;
  isHidden: boolean;
  /** Only present for public test cases */
  input?: string;
  /** Only present for public test cases */
  expectedOutput?: string;
  /** Only present for public test cases */
  actualOutput?: string | null;
  /** Error message, if any */
  error?: string;
  /** Execution time in seconds */
  time?: string;
}

async function executeOnJudge0(
  sourceCode: string,
  languageId: number,
  stdin: string
) {
  return executeJudge0Submission(sourceCode, languageId, stdin);
}

export async function POST(request: Request) {
  try {
    // 1. Auth + eligibility
    const eligibility = await checkActivityEligibility();
    if (!eligibility) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!eligibility.eligible) {
      return NextResponse.json({ error: "Forbidden: Not eligible for activities" }, { status: 403 });
    }

    // 2. Parse request
    const body = (await request.json()) as {
      templateId: string;
      variantSeed: string;
      sourceCode: string;
      languageId: number;
    };

    const { templateId, variantSeed, sourceCode, languageId } = body;

    if (!templateId || !sourceCode || !languageId || !variantSeed) {
      return NextResponse.json(
        { error: "Missing required fields: templateId, variantSeed, sourceCode, languageId" },
        { status: 400 }
      );
    }

    // 3. Size check
    const sourceBytes = new TextEncoder().encode(sourceCode).length;
    if (sourceBytes > MAX_SOURCE_CODE_BYTES) {
      return NextResponse.json(
        { error: `Source code exceeds maximum size of ${MAX_SOURCE_CODE_BYTES / 1024} KB` },
        { status: 413 }
      );
    }

    // 4. Fetch template
    const template = await db.activityTemplate.findUnique({
      where: { id: templateId },
      select: { variables: true, hiddenTestCases: true, activityType: true },
    });

    if (!template || template.activityType !== "codelab") {
      return NextResponse.json({ error: "Template not found or not a CodeLab" }, { status: 404 });
    }

    // 5. Parse template data
    const variablesObj = JSON.parse((template.variables as string) || "{}");
    const hiddenTestCasesRaw: RawTestCase[] = JSON.parse(
      (template.hiddenTestCases as string) || "[]"
    );
    const publicTestCasesRaw: RawTestCase[] = variablesObj.publicTestCases || [];
    const variablesConfig: CodeLabVariable[] = variablesObj.variablesConfig || [];

    // Evaluate variables deterministic based on seed
    const evaluatedVars = evaluateVariables(variantSeed, variablesConfig);

    // 6. Build full test case list
    const allTestCases: { tc: RawTestCase; isHidden: boolean }[] = [
      ...publicTestCasesRaw.map((tc) => ({ tc, isHidden: false })),
      ...hiddenTestCasesRaw.map((tc) => ({ tc, isHidden: true })),
    ];

    // 7. Execute all test cases
    const results: TestRunResult[] = [];
    let passCount = 0;

    for (let i = 0; i < allTestCases.length; i++) {
      const { tc, isHidden } = allTestCases[i];
      const substitutedInput = substituteTemplate(tc.input, evaluatedVars);
      const substitutedExpected = substituteTemplate(tc.expectedOutput, evaluatedVars);

      try {
        const judgeResult = await executeOnJudge0(sourceCode, languageId, substitutedInput);
        const actualOut = (judgeResult.stdout || "").trim();
        const expectedOut = substitutedExpected.trim();
        const passed = judgeResult.status.id === 3 && actualOut === expectedOut;

        if (passed) passCount++;

        const result: TestRunResult = {
          index: i,
          passed,
          isHidden,
          time: judgeResult.time,
        };

        // Only expose details for public test cases
        if (!isHidden) {
          result.input = substitutedInput;
          result.expectedOutput = substitutedExpected;
          result.actualOutput = actualOut;
          result.error =
            judgeResult.stderr ||
            judgeResult.compile_output ||
            (judgeResult.status.id !== 3 ? judgeResult.status.description : undefined) ||
            undefined;
        }

        results.push(result);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Execution failed";
        const result: TestRunResult = {
          index: i,
          passed: false,
          isHidden,
        };
        if (!isHidden) {
          result.input = substitutedInput;
          result.expectedOutput = substitutedExpected;
          result.actualOutput = null;
          result.error = errorMessage;
        }
        results.push(result);
      }
    }

    const totalCount = allTestCases.length;
    const score = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

    return NextResponse.json({
      results,
      passCount,
      totalCount,
      score,
      allPassed: passCount === totalCount,
    });
  } catch (error: unknown) {
    console.error("CODELAB_RUN_TESTS_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
