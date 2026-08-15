/**
 * POST /api/codelab/evaluate
 *
 * Secure server-side test case evaluation engine for CodeLab.
 * Evaluates student code against ALL test cases (public + hidden).
 *
 * Security Invariants:
 *  1. Requires authenticated session + ICS eligibility
 *  2. Hidden test case inputs and expected outputs are NEVER returned to client
 *  3. Concurrency is throttled to chunks of 2 for Judge0 stability
 *  4. Enforces 64 KB payload limits
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { checkActivityEligibility } from "@/lib/activity-eligibility";
import { getProblemById } from "@/features/interactive-activities/codelab/problems";
import { evaluateVariables, substituteTemplate } from "@/features/interactive-activities/codelab/utils/problem-engine";
import { wrapStudentCode, WrapperLanguage } from "@/features/interactive-activities/codelab/utils/code-wrappers";
import { executeLocally } from "@/features/interactive-activities/codelab/utils/local-runner";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const JUDGE0_BASE_URL = process.env.JUDGE0_URL || "http://localhost:2358";
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || "";
const MAX_SOURCE_CODE_BYTES = 64 * 1024;

interface EvaluateRequest {
  templateId: string;
  seed: string;
  sourceCode: string;
  languageId: number;
}

interface PublicTestResult {
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  error?: string;
  time: string;
}

interface HiddenTestResult {
  passed: boolean;
  error?: string;
}

interface EvaluateResponse {
  publicResults: PublicTestResult[];
  hiddenResults: HiddenTestResult[];
  totalPassed: number;
  totalCases: number;
  score: number;
}

async function executeTestCaseOnJudge0(
  sourceCode: string,
  languageId: number,
  stdin: string
): Promise<{
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  status: { id: number; description: string };
}> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (JUDGE0_AUTH_TOKEN) {
    headers["X-Auth-Token"] = JUDGE0_AUTH_TOKEN;
  }

  try {
    const res = await fetch(
      `${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          source_code: sourceCode,
          language_id: languageId,
          stdin: stdin || "",
          cpu_time_limit: 5.0,
          memory_limit: 128000,
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (data.status?.id !== 13) {
        return data;
      }
      console.warn("Judge0 returned internal error in evaluate, using local runner:", data.message);
    }
  } catch (err: unknown) {
    console.warn("Judge0 connection failed in evaluate, using local runner:", err);
  }

  // Fallback to local runner
  const localRes = await executeLocally(sourceCode, languageId, stdin);
  return {
    stdout: localRes.stdout,
    stderr: localRes.stderr,
    compile_output: localRes.compile_output,
    time: localRes.time,
    status: localRes.status,
  };
}

export async function POST(request: Request) {
  try {
    // 1. Session check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. ICS Eligibility guard
    const eligibility = await checkActivityEligibility();
    if (!eligibility || !eligibility.eligible) {
      return NextResponse.json({ error: "Forbidden: Not eligible for activities" }, { status: 403 });
    }

    // 3. Parse and validate body
    const body = (await request.json()) as EvaluateRequest;
    const { templateId, seed, sourceCode, languageId } = body;

    if (!templateId || !seed || !sourceCode || !languageId) {
      return NextResponse.json(
        { error: "Missing required fields: templateId, seed, sourceCode, languageId" },
        { status: 400 }
      );
    }

    const sourceBytes = new TextEncoder().encode(sourceCode).length;
    if (sourceBytes > MAX_SOURCE_CODE_BYTES) {
      return NextResponse.json(
        { error: `Source code exceeds maximum size of ${MAX_SOURCE_CODE_BYTES / 1024} KB` },
        { status: 413 }
      );
    }

    // 4. Resolve problem definition (from Problem Bank or DB)
    const problem = getProblemById(templateId);

    function getLanguageFromId(id: number): WrapperLanguage {
      switch (id) {
        case 71: return "python";
        case 93: return "javascript";
        case 54: return "cpp";
        case 62: return "java";
        case 51: return "csharp";
        case 82: return "sql";
        default: return "python";
      }
    }

    const wrapperLang: WrapperLanguage = getLanguageFromId(languageId);

    let testCasesToRun: Array<{
      input: string;
      expectedOutput: string;
      isHidden: boolean;
    }> = [];

    if (problem) {
      const evaluatedVars = evaluateVariables(seed, problem.variables);

      testCasesToRun = problem.testCases.map((tc) => ({
        input: substituteTemplate(tc.inputTemplate, evaluatedVars),
        expectedOutput: problem.computeExpectedOutput(evaluatedVars, tc),
        isHidden: tc.isHidden,
      }));
    } else {
      // Fallback to database activity template
      const template = await db.activityTemplate.findUnique({
        where: { id: templateId },
        select: { variables: true, hiddenTestCases: true, activityType: true },
      });

      if (!template || template.activityType !== "codelab") {
        return NextResponse.json({ error: "CodeLab problem template not found" }, { status: 404 });
      }

      const variablesObj = JSON.parse((template.variables as string) || "{}");
      const hiddenCases = JSON.parse((template.hiddenTestCases as string) || "[]");
      const publicCases = variablesObj.publicTestCases || [];
      const evaluatedVars = evaluateVariables(seed, variablesObj.variablesConfig || []);

      testCasesToRun = [
        ...publicCases.map((tc: { input: string; expectedOutput: string }) => ({
          input: substituteTemplate(tc.input, evaluatedVars),
          expectedOutput: substituteTemplate(tc.expectedOutput, evaluatedVars),
          isHidden: false,
        })),
        ...hiddenCases.map((tc: { input: string; expectedOutput: string }) => ({
          input: substituteTemplate(tc.input, evaluatedVars),
          expectedOutput: substituteTemplate(tc.expectedOutput, evaluatedVars),
          isHidden: true,
        })),
      ];
    }

    const publicResults: PublicTestResult[] = [];
    const hiddenResults: HiddenTestResult[] = [];
    let totalPassed = 0;

    // 5. Batch test case executions in chunks of 2 to protect Judge0 workers
    const CHUNK_SIZE = 2;
    for (let i = 0; i < testCasesToRun.length; i += CHUNK_SIZE) {
      const chunk = testCasesToRun.slice(i, i + CHUNK_SIZE);
      const chunkResults = await Promise.allSettled(
        chunk.map(async (tc) => {
          const finalCode = wrapStudentCode(wrapperLang, sourceCode, null, tc.input);
          const judgeOut = await executeTestCaseOnJudge0(finalCode, languageId, tc.input);
          const actualOutput = (judgeOut.stdout || "").trim();
          const expectedOutput = tc.expectedOutput.trim();
          const passed = judgeOut.status.id === 3 && actualOutput === expectedOutput;
          const error =
            judgeOut.stderr ||
            judgeOut.compile_output ||
            (judgeOut.status.id !== 3 ? judgeOut.status.description : undefined) ||
            undefined;

          return {
            passed,
            input: tc.input,
            expectedOutput,
            actualOutput,
            error,
            time: judgeOut.time || "0",
            isHidden: tc.isHidden,
          };
        })
      );

      for (let j = 0; j < chunkResults.length; j++) {
        const res = chunkResults[j];
        const tc = chunk[j];

        if (res.status === "fulfilled") {
          const outcome = res.value;
          if (outcome.passed) totalPassed++;

          if (tc.isHidden) {
            // NEVER reveal input or expectedOutput for hidden test cases
            hiddenResults.push({
              passed: outcome.passed,
              error: outcome.error,
            });
          } else {
            publicResults.push({
              passed: outcome.passed,
              input: outcome.input,
              expectedOutput: outcome.expectedOutput,
              actualOutput: outcome.actualOutput,
              error: outcome.error,
              time: outcome.time,
            });
          }
        } else {
          // Execution failed
          if (tc.isHidden) {
            hiddenResults.push({
              passed: false,
              error: res.reason instanceof Error ? res.reason.message : "Execution failed",
            });
          } else {
            publicResults.push({
              passed: false,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput: "",
              error: res.reason instanceof Error ? res.reason.message : "Execution error",
              time: "0",
            });
          }
        }
      }
    }

    const totalCases = testCasesToRun.length;
    const score = totalCases > 0 ? Math.round((totalPassed / totalCases) * 100) : 0;

    const responsePayload: EvaluateResponse = {
      publicResults,
      hiddenResults,
      totalPassed,
      totalCases,
      score,
    };

    return NextResponse.json(responsePayload);
  } catch (error: unknown) {
    console.error("CODELAB_EVALUATE_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
