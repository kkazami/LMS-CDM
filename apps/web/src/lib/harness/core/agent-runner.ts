/**
 * apps/web/src/lib/harness/core/agent-runner.ts
 *
 * The Lumina LMS Autonomous Agent Runner.
 * Implements the complete AI Agent Workflow Lifecycle (Tutorials Dojo / Dalida standard):
 *  1. User Request ingestion & tenant boundary enforcement
 *  2. Pre-execution safety guardrails
 *  3. Tool Orchestration & Execution
 *  4. Multi-Pillar Validation Gate (Sensors + Evaluators)
 *     Gate 1: Socratic Output Guardrail (keyword + code-block-size check)
 *     Gate 2: Code Syntax Sensor (string-aware brackets + optional Judge0 compile)
 *     Gate 3: Pedagogical Judge (substantive questions + topic relevance + encouragement)
 *     Gate 4: LLM-as-Judge (DeepSeek Flash rubric: relevance, correctness, Socratic quality, clarity)
 *  5. Autonomous Retry Loop (injecting sensor failure reasons back into the prompt if rejected)
 *  6. Memory Update & Observability Tracing
 */

import { AgentRunnerOptions, AgentTraceRecord, LLMJudgeRubricScores, ValidationResult } from "./types";
import { validateTenantBoundary } from "../guardrails/tenant-boundary";
import { inspectStudentInput, inspectAgentOutput } from "../guardrails/socratic-policy";
import { checkRateLimit } from "../guardrails/rate-limiter";
import { evaluatePedagogicalQuality } from "../evaluators/pedagogical-judge";
import { evaluateCodeSnippetSyntax, evaluateCodeWithJudge0 } from "../evaluators/code-evaluator";
import { evaluateWithLLMJudge } from "../evaluators/llm-judge";
import { traceLogger } from "../observability/trace-logger";
import { toolRegistry } from "../tools/registry";

export interface AgentRunResult {
  success: boolean;
  response: string;
  attemptsNeeded: number;
  traceId: string;
  violations: string[];
}

export async function runHarnessedAgent(options: AgentRunnerOptions): Promise<AgentRunResult> {
  const startTotalTime = Date.now();
  const traceId = `trc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { prompt, context, maxRetries = 5, systemDirective } = options;

  const toolsCalled: string[] = [];
  const accumulatedViolations: string[] = [];
  let llmJudgeScores: LLMJudgeRubricScores | undefined;

  // ----------------------------------------------------
  // Stage 1: PRE-FLIGHT GUARDRAILS (Tenant + Rate + Input)
  // ----------------------------------------------------
  const tenantCheck = validateTenantBoundary(context);
  if (!tenantCheck.allowed) {
    const errorRecord: AgentTraceRecord = {
      id: traceId,
      timestamp: new Date().toISOString(),
      userId: context.userId,
      instituteCode: context.instituteCode,
      prompt,
      attempts: 0,
      totalDurationMs: Date.now() - startTotalTime,
      toolsCalled: [],
      guardrailViolations: [tenantCheck.reason || "Tenant violation"],
      validationScore: 0,
      finalResponse: "Access Denied: Invalid tenant context.",
      status: "GUARDRAIL_REJECTED",
    };
    traceLogger.logTrace(errorRecord);
    return {
      success: false,
      response: tenantCheck.reason || "Access Denied: Invalid tenant context.",
      attemptsNeeded: 0,
      traceId,
      violations: [tenantCheck.reason || "Tenant violation"],
    };
  }

  const rateCheck = checkRateLimit(context.userId);
  if (!rateCheck.allowed) {
    traceLogger.logTrace({
      id: traceId,
      timestamp: new Date().toISOString(),
      userId: context.userId,
      instituteCode: context.instituteCode,
      prompt,
      attempts: 0,
      totalDurationMs: Date.now() - startTotalTime,
      toolsCalled: [],
      guardrailViolations: [rateCheck.reason || "Rate limit exceeded"],
      validationScore: 0,
      finalResponse: rateCheck.reason || "Rate limit reached.",
      status: "GUARDRAIL_REJECTED",
    });
    return {
      success: false,
      response: rateCheck.reason || "Rate limit reached.",
      attemptsNeeded: 0,
      traceId,
      violations: [rateCheck.reason || "Rate limit exceeded"],
    };
  }

  const inputCheck = inspectStudentInput(prompt);
  if (!inputCheck.allowed) {
    const defaultBlockMsg =
      "I am your Socratic coding assistant. I cannot solve the problem or reveal hidden answers for you, but I can help you understand the error! What specific line or logic are you stuck on?";
    traceLogger.logTrace({
      id: traceId,
      timestamp: new Date().toISOString(),
      userId: context.userId,
      instituteCode: context.instituteCode,
      prompt,
      attempts: 0,
      totalDurationMs: Date.now() - startTotalTime,
      toolsCalled: [],
      guardrailViolations: [inputCheck.reason || "Input policy flagged"],
      validationScore: 0,
      finalResponse: defaultBlockMsg,
      status: "GUARDRAIL_REJECTED",
    });
    return {
      success: false,
      response: defaultBlockMsg,
      attemptsNeeded: 0,
      traceId,
      violations: [inputCheck.reason || "Input policy flagged"],
    };
  }

  // ----------------------------------------------------
  // Stage 2 to 5: PLANNER, TOOLS, VALIDATION & RETRY LOOP
  // ----------------------------------------------------
  let attempt = 0;
  let currentInstruction = prompt;
  let finalResponse = "";
  let finalScore = 0;

  while (attempt < maxRetries) {
    attempt++;

    // A. Tool Execution & Model Draft Generation
    // (In production, this calls the underlying LLM provider or deterministic engine)
    const draftResponse = await generateAgentDraft({
      instruction: currentInstruction,
      systemDirective:
        systemDirective ||
        "You are an expert Socratic tutor for the CdM LMS CodeLab. Guide the student by asking thoughtful questions and pointing to syntax errors without writing the whole solution.",
      context,
      attempt,
    });

    // --------------------------------------------------
    // Gate 1: Socratic Output Inspection
    // --------------------------------------------------
    const outputGuardrail = inspectAgentOutput(draftResponse);
    if (!outputGuardrail.allowed) {
      accumulatedViolations.push(`Attempt ${attempt}: ${outputGuardrail.reason}`);
      currentInstruction = `[HARNESS SENSOR ALERT - ATTEMPT ${attempt} REJECTED]
Your draft response was rejected by safety guardrails: "${outputGuardrail.reason}".
DO NOT provide the full solution or large code blocks. Frame your response as a guiding question that helps the student spot their mistake.`;
      continue;
    }

    // --------------------------------------------------
    // Gate 2: Code Syntax Sensor (ALL code blocks)
    // --------------------------------------------------
    const codeBlockRegex = /```([a-z]*)\n([\s\S]*?)```/g;
    let codeBlockFailed = false;

    for (const match of draftResponse.matchAll(codeBlockRegex)) {
      const fenceLanguage = match[1]?.trim() || "javascript";
      const codeContent = match[2];

      if (!codeContent || codeContent.trim().length === 0) continue;

      // Synchronous bracket/structure check
      const syntaxCheck = evaluateCodeSnippetSyntax(codeContent, fenceLanguage);
      if (!syntaxCheck.passed) {
        accumulatedViolations.push(`Attempt ${attempt}: ${syntaxCheck.violations.join(", ")}`);
        currentInstruction = `[HARNESS SENSOR ALERT - SYNTAX DEFECT]
${syntaxCheck.feedbackForRetry}`;
        codeBlockFailed = true;
        break;
      }

      // Async Judge0 compile check (optional — gracefully degrades if unavailable)
      const judge0Check = await evaluateCodeWithJudge0(codeContent, fenceLanguage);
      if (!judge0Check.passed) {
        accumulatedViolations.push(`Attempt ${attempt}: ${judge0Check.violations.join(", ")}`);
        currentInstruction = `[HARNESS SENSOR ALERT - COMPILATION DEFECT]
${judge0Check.feedbackForRetry}`;
        codeBlockFailed = true;
        break;
      }
    }

    if (codeBlockFailed) continue;

    // --------------------------------------------------
    // Gate 3: Pedagogical Quality Judge (with topic relevance)
    // --------------------------------------------------
    const pedagogicalCheck = evaluatePedagogicalQuality(draftResponse, prompt);
    finalScore = pedagogicalCheck.score;

    if (!pedagogicalCheck.passed) {
      accumulatedViolations.push(`Attempt ${attempt}: ${pedagogicalCheck.violations.join(", ")}`);
      currentInstruction = `[HARNESS SENSOR ALERT - PEDAGOGICAL DEFECT]
${pedagogicalCheck.feedbackForRetry}`;
      continue;
    }

    // --------------------------------------------------
    // Gate 4: LLM-as-Judge (DeepSeek Flash rubric grading)
    // --------------------------------------------------
    const llmJudgeCheck = await evaluateWithLLMJudge(prompt, draftResponse, {
      language: extractDominantLanguage(draftResponse),
    });

    llmJudgeScores = llmJudgeCheck.rubricScores;
    finalScore = Math.round((pedagogicalCheck.score + llmJudgeCheck.score) / 2);

    if (!llmJudgeCheck.passed) {
      accumulatedViolations.push(`Attempt ${attempt}: ${llmJudgeCheck.violations.join(", ")}`);
      currentInstruction = `[HARNESS SENSOR ALERT - LLM JUDGE DEFECT]
${llmJudgeCheck.feedbackForRetry}`;
      continue;
    }

    // If all validation sensors passed:
    finalResponse = draftResponse;
    break;
  }

  // If retries exhausted and no response passed:
  const success = finalResponse.length > 0;
  if (!success) {
    finalResponse =
      "I'm here to help you work through this challenge step-by-step. What is your current understanding of the problem requirements?";
  }

  // ----------------------------------------------------
  // Stage 6: OBSERVABILITY TRACING & RETURN
  // ----------------------------------------------------
  const totalDurationMs = Date.now() - startTotalTime;
  const traceRecord: AgentTraceRecord = {
    id: traceId,
    timestamp: new Date().toISOString(),
    userId: context.userId,
    instituteCode: context.instituteCode,
    prompt,
    attempts: attempt,
    totalDurationMs,
    toolsCalled,
    guardrailViolations: accumulatedViolations,
    validationScore: finalScore,
    llmJudgeScores,
    finalResponse,
    status: success ? "SUCCESS" : "RETRIES_EXHAUSTED",
  };

  traceLogger.logTrace(traceRecord);

  return {
    success,
    response: finalResponse,
    attemptsNeeded: attempt,
    traceId,
    violations: accumulatedViolations,
  };
}

/**
 * Extracts the dominant programming language from code fences in the response.
 * Returns the first language tag found, or undefined if none.
 */
function extractDominantLanguage(response: string): string | undefined {
  const match = response.match(/```([a-z]+)\n/);
  return match?.[1] || undefined;
}

/**
 * Internal helper to generate agent draft.
 * Formulates response respecting Socratic guidelines.
 *
 * NOTE: This is a deterministic stub for development/testing.
 * In production, replace with a real LLM call (e.g., via Agent Router).
 */
async function generateAgentDraft(params: {
  instruction: string;
  systemDirective: string;
  context: unknown;
  attempt: number;
}): Promise<string> {
  const { instruction } = params;

  // If this is an autonomous retry after a violation, generate the corrected Socratic guidance
  if (instruction.includes("HARNESS SENSOR ALERT")) {
    return (
      "Great effort working through this array iteration problem! Notice how your loop condition " +
      "uses `i <= array.length` — consider what happens when `i` equals `array.length`. " +
      "What is the last valid index for an array of length 5, and how does that compare " +
      "to the value of `i` when the IndexOutOfBounds error is thrown?"
    );
  }

  // Default initial response
  return (
    "I can see you're running into an IndexOutOfBounds error on line 14 during array iteration. " +
    "That's a great observation — try examining your loop's boundary condition. " +
    "Consider this: if your array has 10 elements, what is the highest valid index you can access, " +
    "and what does your loop variable equal when the error occurs?"
  );
}

