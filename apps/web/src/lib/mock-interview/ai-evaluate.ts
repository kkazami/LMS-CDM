/**
 * Server-only AI evaluation service for Mock Interview Applicant Mode.
 *
 * Provider policy (cost control): at most ONE Gemini attempt, then at most ONE Groq attempt.
 * No retry loops and no multi-model fallback chain. The whole evaluation is capped at 20 s.
 * Credentials are read from the server environment only and are never returned or logged.
 */

import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { z } from "zod";
import { buildEvaluationPrompt, EVALUATION_SYSTEM_INSTRUCTION } from "./ai-prompt";
import {
  AI_ANSWER_STATUSES,
  AI_CRITERION_IDS,
  computeScoreFromCriteria,
  ratingForScore,
  type AiAnswerStatus,
  type MockInterviewAiEvaluation,
} from "./ai-types";
import type { InterviewQuestionItem } from "./types";

export const AI_TOTAL_TIMEOUT_MS = 20_000;
const GEMINI_TIMEOUT_MS = 12_000;
const GEMINI_MAX_OUTPUT_TOKENS = 1100;
const GROQ_MAX_OUTPUT_TOKENS = 1400;

export type AiProviderName = "gemini" | "groq";

export interface ModelCaller {
  generate(params: {
    systemInstruction: string;
    userPrompt: string;
    timeoutMs: number;
    provider: AiProviderName;
  }): Promise<string>;
}

export interface EvaluationOutcome {
  ok: boolean;
  evaluation?: MockInterviewAiEvaluation;
  provider?: AiProviderName;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function cleanKey(name: string, minLength: number): string {
  const key = (process.env[name] || "").trim().replace(/^["']|["']$/g, "");
  return key.length >= minLength && !/your|api-key|placeholder/i.test(key) ? key : "";
}

export function isAiEvaluationEnabled(): boolean {
  return (process.env.MOCK_INTERVIEW_AI_ENABLED || "").trim().toLowerCase() === "true";
}

function geminiKey(): string {
  return cleanKey("MOCK_INTERVIEW_GEMINI_API_KEY", 20) || cleanKey("GEMINI_API_KEY", 20);
}

function groqKey(): string {
  return cleanKey("GROQ_API_KEY", 15);
}

export function isAiProviderConfigured(): boolean {
  return Boolean(geminiKey() || groqKey());
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

const shortText = (max: number) => z.string().trim().min(1).max(max);

const rawCriterionSchema = z
  .object({
    id: z.enum(AI_CRITERION_IDS),
    level: z.number().min(0).max(4).optional(),
    met: z.boolean().optional(),
    reason: z.string().trim().max(400),
  })
  .refine((c) => typeof c.level === "number" || typeof c.met === "boolean", {
    message: "Each criterion requires level or met",
  });

const rawEvaluationSchema = z
  .object({
    answerStatus: z.enum(AI_ANSWER_STATUSES).optional(),
    score: z.number().min(0).max(100).optional(),
    summary: z.string().trim().max(500).optional(),
    questionInsight: z.string().trim().max(600).optional(),
    nextStep: z.string().trim().max(500).optional(),
    answerOutline: z.array(shortText(400)).min(1).max(6).optional(),
    criteria: z.array(rawCriterionSchema).length(AI_CRITERION_IDS.length),
    strengths: z.array(shortText(400)).min(1).max(5),
    recommendations: z.array(shortText(400)).min(1).max(5),
    improvedSentence: z.string().trim().max(800),
  })
  .refine(
    (data) =>
      typeof data.score === "number" ||
      data.criteria.every((c) => typeof c.level === "number"),
    { message: "Requires either criterion levels or an explicit score" }
  );

/** Extracts the first JSON object from a model response (tolerates code fences / preamble). */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** Validates raw model text and normalizes it into the public evaluation shape. */
export function parseEvaluation(text: string): MockInterviewAiEvaluation | null {
  const json = extractJsonObject(text);
  if (json === null) return null;
  const parsed = rawEvaluationSchema.safeParse(json);
  if (!parsed.success) return null;

  const ids = new Set(parsed.data.criteria.map((c) => c.id));
  if (ids.size !== AI_CRITERION_IDS.length) return null;

  const hasLevels = parsed.data.criteria.every((c) => typeof c.level === "number");
  const answerStatus: AiAnswerStatus = parsed.data.answerStatus ?? "ANSWERED";
  const isNonAnswer = answerStatus === "NOT_AN_ANSWER";

  const criteria = AI_CRITERION_IDS.map((id) => parsed.data.criteria.find((c) => c.id === id)!).map((c) => {
    if (isNonAnswer) {
      return {
        id: c.id,
        level: 0,
        met: false,
        reason: c.reason,
      };
    }
    if (typeof c.level === "number") {
      const level = Math.max(0, Math.min(4, Math.round(c.level)));
      return {
        id: c.id,
        level,
        met: level >= 3,
        reason: c.reason,
      };
    }
    const met = Boolean(c.met);
    return {
      id: c.id,
      level: met ? 3 : 1,
      met,
      reason: c.reason,
    };
  });

  const score =
    hasLevels || parsed.data.answerStatus !== undefined
      ? computeScoreFromCriteria(criteria, answerStatus)
      : Math.round(parsed.data.score ?? computeScoreFromCriteria(criteria, answerStatus));

  return {
    score,
    rating: ratingForScore(score),
    answerStatus,
    summary: parsed.data.summary || undefined,
    questionInsight: parsed.data.questionInsight || undefined,
    nextStep: parsed.data.nextStep || parsed.data.recommendations[0] || undefined,
    answerOutline: parsed.data.answerOutline || undefined,
    criteria,
    strengths: parsed.data.strengths,
    recommendations: parsed.data.recommendations,
    improvedSentence: parsed.data.improvedSentence,
  };
}

// ---------------------------------------------------------------------------
// Provider calls (single attempt each)
// ---------------------------------------------------------------------------

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class ProductionModelCaller implements ModelCaller {
  async generate({
    systemInstruction,
    userPrompt,
    timeoutMs,
    provider,
  }: {
    systemInstruction: string;
    userPrompt: string;
    timeoutMs: number;
    provider: AiProviderName;
  }): Promise<string> {
    if (provider === "gemini") {
      const key = geminiKey();
      if (!key) throw new Error("PROVIDER_NOT_CONFIGURED");
      const ai = new GoogleGenAI({ apiKey: key });
      const response = await withTimeout(
        ai.models.generateContent({
          model: process.env.GEMINI_MODEL || "gemini-3.1-flash-lite",
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          config: {
            systemInstruction,
            temperature: 0.3,
            maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            responseMimeType: "application/json",
          },
        }),
        timeoutMs
      );
      return response.text ?? "";
    }

    const key = groqKey();
    if (!key) throw new Error("PROVIDER_NOT_CONFIGURED");
    const groq = new Groq({ apiKey: key });
    const completion = await withTimeout(
      groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_completion_tokens: GROQ_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      }),
      timeoutMs
    );
    return completion.choices?.[0]?.message?.content ?? "";
  }
}

/**
 * Evaluates an answer. Gemini first (one attempt); Groq only if Gemini errors, times out, or
 * returns output that fails validation (one attempt). Never throws and never leaks provider errors.
 */
export async function evaluateApplicantAnswer({
  question,
  answer,
  caller = new ProductionModelCaller(),
  totalTimeoutMs = AI_TOTAL_TIMEOUT_MS,
}: {
  question: InterviewQuestionItem;
  answer: string;
  caller?: ModelCaller;
  totalTimeoutMs?: number;
}): Promise<EvaluationOutcome> {
  const userPrompt = buildEvaluationPrompt(question, answer);
  const deadline = Date.now() + totalTimeoutMs;

  const attempts: Array<{ provider: AiProviderName; configured: boolean; budgetMs: number }> = [
    { provider: "gemini", configured: Boolean(geminiKey()), budgetMs: Math.min(GEMINI_TIMEOUT_MS, totalTimeoutMs) },
    { provider: "groq", configured: Boolean(groqKey()), budgetMs: totalTimeoutMs },
  ];

  for (const attempt of attempts) {
    if (!attempt.configured) continue;
    const remaining = deadline - Date.now();
    if (remaining < 1000) break;

    try {
      const text = await caller.generate({
        systemInstruction: EVALUATION_SYSTEM_INSTRUCTION,
        userPrompt,
        timeoutMs: Math.min(attempt.budgetMs, remaining),
        provider: attempt.provider,
      });
      const evaluation = parseEvaluation(text);
      if (evaluation) return { ok: true, evaluation, provider: attempt.provider };
      console.warn(`[MockInterviewAI] ${attempt.provider} returned output that failed validation.`);
    } catch (err) {
      const reason = err instanceof Error && err.message === "AI_TIMEOUT" ? "timeout" : "error";
      console.warn(`[MockInterviewAI] ${attempt.provider} attempt failed (${reason}).`);
    }
  }

  return { ok: false };
}
