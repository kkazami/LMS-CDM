/**
 * apps/web/src/lib/harness/evaluators/llm-judge.ts
 *
 * LLM-as-Judge Validation Gate (Gate 4)
 * Uses DeepSeek Flash via Agent Router (OpenAI-compatible) to grade the AI's
 * draft response against a structured pedagogical rubric before delivery.
 *
 * Rubric dimensions (each 0-25, total /100):
 *   - Relevance:        Does the response address the student's specific question?
 *   - Correctness:      Are code hints, explanations, and referenced APIs factually correct?
 *   - Socratic Quality: Does it guide without spoon-feeding? Is the question thought-provoking?
 *   - Clarity:          Is the response clear, well-structured, and free of confusion?
 *
 * Design decisions:
 *   - Uses "deepseek-flash" via Agent Router (https://agentrouter.org/v1)
 *   - 8s timeout with graceful degradation (never blocks the student)
 *   - JSON mode for structured rubric output
 *   - Pass threshold: total ≥ 70/100
 */

import OpenAI from "openai";
import { ValidationResult, LLMJudgeRubricScores } from "../core/types";

export interface LLMJudgeResult extends ValidationResult {
  rubricScores: LLMJudgeRubricScores;
}

/** Default rubric scores when the judge cannot run (graceful degradation) */
const DEFAULT_PASS_SCORES: LLMJudgeRubricScores = {
  relevance: 20,
  correctness: 20,
  socraticQuality: 20,
  clarity: 20,
};

const JUDGE_SYSTEM_PROMPT = `You are a strict pedagogical quality reviewer for a university LMS coding tutor (Socratic method).

You will receive:
- STUDENT_PROMPT: The student's original question or request.
- AGENT_RESPONSE: The AI tutor's draft response to the student.

Score the AGENT_RESPONSE on these 4 dimensions (0-25 each):

1. **relevance** (0-25): Does the response directly address the student's specific question, error, or confusion? Score 0 if the response is about an unrelated topic. Score 25 if it precisely targets the student's stated problem.

2. **correctness** (0-25): Are any code snippets, API references, explanations, or technical claims factually correct? Penalize hallucinated methods, wrong syntax, or incorrect logic. Score 25 if all technical content is accurate.

3. **socraticQuality** (0-25): Does the response GUIDE the student toward discovering the answer themselves, rather than giving the solution directly? Does it ask a genuinely thought-provoking question? Score 0 if it spoon-feeds the answer. Score 25 if it masterfully leads the student to think critically.

4. **clarity** (0-25): Is the response well-structured, concise, and easy for a student to follow? Penalize confusing explanations, wall-of-text responses, or disorganized thoughts. Score 25 if it's crystal clear.

Respond with ONLY a JSON object in this exact format (no markdown, no code fences):
{
  "relevance": <number 0-25>,
  "correctness": <number 0-25>,
  "socraticQuality": <number 0-25>,
  "clarity": <number 0-25>,
  "reasoning": "<brief 1-2 sentence explanation of any low scores>"
}`;

/**
 * Creates an OpenAI-compatible client pointing at Gemini, Agent Router, or direct provider.
 * Lazily initialized to avoid import-time errors when API key is missing.
 */
function getAgentRouterClient(): { client: OpenAI; model: string } | null {
  // 1. Google Gemini (Preferred when GEMINI_API_KEY is provided)
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey) {
    return {
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      }),
      model: process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash",
    };
  }

  // 2. Agent Router / DeepSeek / OpenAI fallbacks
  const apiKey =
    process.env.AGENT_ROUTER_API_KEY?.trim() ||
    process.env.DEEPSEEK_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    console.warn("[LLM-JUDGE] Neither GEMINI_API_KEY nor AGENT_ROUTER_API_KEY is set, LLM judge will be skipped.");
    return null;
  }

  const baseURL =
    process.env.AGENT_ROUTER_BASE_URL?.trim() ||
    (process.env.DEEPSEEK_API_KEY ? "https://api.deepseek.com/v1" : "https://agentrouter.org/v1");

  const model =
    process.env.AGENT_ROUTER_MODEL?.trim() ||
    (process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "deepseek-flash");

  return {
    client: new OpenAI({
      apiKey,
      baseURL,
    }),
    model,
  };
}



/**
 * Parses the judge model's response into rubric scores.
 * Handles JSON potentially wrapped in markdown code fences.
 */
function parseJudgeResponse(content: string): LLMJudgeRubricScores & { reasoning?: string } {
  let cleaned = content.trim();

  // Strip markdown fences if wrapping everything
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }

  // Extract the JSON object boundaries
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  const parsed = JSON.parse(cleaned);

  // Clamp each score to 0-25
  const clamp = (v: unknown, max: number): number => {
    const n = typeof v === "number" ? v : 0;
    return Math.max(0, Math.min(max, Math.round(n)));
  };

  return {
    relevance: clamp(parsed.relevance, 25),
    correctness: clamp(parsed.correctness, 25),
    socraticQuality: clamp(parsed.socraticQuality, 25),
    clarity: clamp(parsed.clarity, 25),
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning : undefined,
  };
}

/**
 * Evaluates the AI tutor's response using DeepSeek Flash via Agent Router.
 *
 * @param studentPrompt  - The student's original question
 * @param agentResponse  - The AI tutor's draft response to evaluate
 * @param context        - Optional context (courseId, language) for richer evaluation
 * @returns LLMJudgeResult with rubric scores and pass/fail
 */
export async function evaluateWithLLMJudge(
  studentPrompt: string,
  agentResponse: string,
  context?: { courseId?: string; language?: string }
): Promise<LLMJudgeResult> {
  const provider = getAgentRouterClient();

  // Graceful degradation: if no API key, pass with default scores
  if (!provider) {
    return {
      passed: true,
      score: 80,
      violations: [],
      rubricScores: DEFAULT_PASS_SCORES,
      feedbackForRetry: undefined,
    };
  }

  try {
    const contextLine = context?.language
      ? `\nCONTEXT: The student is working in ${context.language}.`
      : "";

    const response = await provider.client.chat.completions.create(
      {
        model: provider.model,
        messages: [
          { role: "system", content: JUDGE_SYSTEM_PROMPT },
          {
            role: "user",
            content: `STUDENT_PROMPT:\n${studentPrompt}\n\nAGENT_RESPONSE:\n${agentResponse}${contextLine}`,
          },
        ],
        temperature: 0.1, // Low temperature for consistent grading
        max_tokens: 1000,
      },
      {
        timeout: 8000, // 8s max — don't block the student
      }
    );

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from judge model");
    }

    const scores = parseJudgeResponse(content);
    const totalScore = scores.relevance + scores.correctness + scores.socraticQuality + scores.clarity;
    const clampedTotal = Math.max(0, Math.min(100, totalScore));
    const passed = clampedTotal >= 70;

    const violations: string[] = [];
    if (scores.relevance < 15) {
      violations.push(`Low relevance score (${scores.relevance}/25): Response may not address the student's actual question.`);
    }
    if (scores.correctness < 15) {
      violations.push(`Low correctness score (${scores.correctness}/25): Response may contain factual errors or incorrect code.`);
    }
    if (scores.socraticQuality < 15) {
      violations.push(`Low Socratic quality (${scores.socraticQuality}/25): Response may be spoon-feeding rather than guiding.`);
    }
    if (scores.clarity < 15) {
      violations.push(`Low clarity score (${scores.clarity}/25): Response may be confusing or poorly structured.`);
    }

    // Include judge reasoning in violations if present and score is low
    if (scores.reasoning && !passed) {
      violations.push(`Judge reasoning: ${scores.reasoning}`);
    }

    return {
      passed,
      score: clampedTotal,
      violations,
      rubricScores: {
        relevance: scores.relevance,
        correctness: scores.correctness,
        socraticQuality: scores.socraticQuality,
        clarity: scores.clarity,
      },
      feedbackForRetry: passed
        ? undefined
        : `LLM Judge evaluation failed (score ${clampedTotal}/100). Breakdown — Relevance: ${scores.relevance}/25, Correctness: ${scores.correctness}/25, Socratic Quality: ${scores.socraticQuality}/25, Clarity: ${scores.clarity}/25. Deficiencies: ${violations.join("; ")}. Revise your response to directly address the student's question with accurate information and a genuinely thought-provoking guiding question.`,
    };
  } catch (err) {
    // Graceful degradation: if the judge fails (network, timeout, parse error),
    // don't block the student. Log the error and pass with default scores.
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.warn(`[LLM-JUDGE] Judge evaluation failed, gracefully degrading: ${errorMsg}`);

    return {
      passed: true,
      score: 80,
      violations: [],
      rubricScores: DEFAULT_PASS_SCORES,
      feedbackForRetry: undefined,
    };
  }
}
