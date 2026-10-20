/**
 * apps/web/src/lib/ite/guidance/ai-client.ts
 *
 * Server-only AI client for ITE Study Help.
 * Follows identical provider order as general chatbot: Gemini primary -> Groq fallback.
 * Enforces a strict 20-second timeout and 1 retry on malformed JSON output.
 * Never logs or returns API keys or raw internal provider error traces.
 */

import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { buildStudyHelpPrompt } from "./prompt";
import { validateStudyHelpOutput } from "./output-validator";
import type { StudyHelpContent } from "./types";

export const MODEL_TIMEOUT_MS = 20_000;

export interface AiClientExecutionResult {
  success: boolean;
  content?: StudyHelpContent;
  provider?: "gemini" | "groq";
  error?: string;
  statusCode?: number;
}

export interface ModelCaller {
  generate(params: {
    systemInstruction: string;
    userPrompt: string;
    temperature?: number;
  }): Promise<{ text: string; provider: "gemini" | "groq" }>;
}

function resolveEnvKey(varName: string, minLength: number): string {
  let key = (process.env[varName] || "").trim().replace(/^["']|["']$/g, "");
  if (
    !key ||
    key.toLowerCase().includes("your") ||
    key.toLowerCase().includes("api-key") ||
    key.toLowerCase().includes("placeholder") ||
    key.length < minLength
  ) {
    try {
      const candidatePaths = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), "apps/web/.env"),
        path.resolve(process.cwd(), "apps/web/.env.local"),
        path.resolve(process.cwd(), "../../.env"),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf8");
          const regex = new RegExp(`^${varName}=(.*)$`, "m");
          const match = content.match(regex);
          if (match) {
            const parsed = match[1].trim().replace(/^["']|["']$/g, "");
            if (
              parsed &&
              !parsed.toLowerCase().includes("your") &&
              !parsed.toLowerCase().includes("api-key") &&
              !parsed.toLowerCase().includes("placeholder") &&
              parsed.length >= minLength
            ) {
              return parsed;
            }
          }
        }
      }
    } catch {
      // fallback to key
    }
  }
  return key;
}

/**
 * Standard production model caller invoking Gemini with Groq fallback.
 */
export class ProductionGuidanceModelCaller implements ModelCaller {
  async generate({
    systemInstruction,
    userPrompt,
    temperature = 0.3,
  }: {
    systemInstruction: string;
    userPrompt: string;
    temperature?: number;
  }): Promise<{ text: string; provider: "gemini" | "groq" }> {
    const geminiKey = resolveEnvKey("GEMINI_API_KEY", 20);
    const groqKey = resolveEnvKey("GROQ_API_KEY", 15);

    // 1. Try Gemini
    if (geminiKey) {
      const geminiModel = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
      const fallbackModels = ["gemini-3.5-flash-lite", "gemini-flash-latest"].filter((m) => m !== geminiModel);
      const allGeminiCandidates = [geminiModel, ...fallbackModels];

      const ai = new GoogleGenAI({ apiKey: geminiKey });

      for (const candidate of allGeminiCandidates) {
        try {
          const response = await ai.models.generateContent({
            model: candidate,
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction,
              temperature,
            },
          });

          if (response.text) {
            return { text: response.text, provider: "gemini" };
          }
        } catch (err: unknown) {
          // If Gemini fails, log safe notice and proceed down fallback chain
          console.warn(`[ITE Guidance] Gemini model ${candidate} failed. Trying fallback...`);
        }
      }
    }

    // 2. Try Groq fallback
    if (groqKey) {
      const preferredGroqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
      const candidateGroqModels = Array.from(new Set([preferredGroqModel, "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]));

      const groq = new Groq({ apiKey: groqKey });

      for (const model of candidateGroqModels) {
        try {
          const completion = await groq.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userPrompt },
            ],
            temperature,
          });

          const reply = completion.choices?.[0]?.message?.content;
          if (reply) {
            return { text: reply, provider: "groq" };
          }
        } catch (err: unknown) {
          console.warn(`[ITE Guidance] Groq model ${model} failed.`);
        }
      }
    }

    throw new Error("All AI providers failed or are unconfigured.");
  }
}

/**
 * Executes a call with a strict timeout.
 */
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("AI_TIMEOUT"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Main function to request study help with retry and validation.
 */
export async function requestStudyHelp({
  cleanMaterialText,
  caller = new ProductionGuidanceModelCaller(),
  timeoutMs = MODEL_TIMEOUT_MS,
}: {
  cleanMaterialText: string;
  caller?: ModelCaller;
  timeoutMs?: number;
}): Promise<AiClientExecutionResult> {
  const { systemInstruction, userPrompt } = buildStudyHelpPrompt(cleanMaterialText);

  let rawOutput = "";
  let providerUsed: "gemini" | "groq" = "gemini";

  // First Attempt
  try {
    const res = await withTimeout(
      caller.generate({ systemInstruction, userPrompt, temperature: 0.3 }),
      timeoutMs
    );
    rawOutput = res.text;
    providerUsed = res.provider;
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.message === "AI_TIMEOUT";
    return {
      success: false,
      error: isTimeout
        ? "The study assistant timed out. Please try again in a few moments."
        : "The study assistant is currently busy. Please try again shortly.",
      statusCode: isTimeout ? 504 : 503,
    };
  }

  // Validate Output
  let validation = validateStudyHelpOutput(rawOutput);
  if (validation.valid) {
    return {
      success: true,
      content: validation.data,
      provider: providerUsed,
    };
  }

  // Single Retry on invalid output
  console.warn(`[ITE Guidance] First attempt output validation failed (${validation.error}). Retrying once...`);
  try {
    const retryUserPrompt = `${userPrompt}\n\nIMPORTANT: Your previous output failed JSON validation. You must output ONLY strict JSON conforming to the exact schema.`;
    const res = await withTimeout(
      caller.generate({ systemInstruction, userPrompt: retryUserPrompt, temperature: 0.2 }),
      timeoutMs
    );
    rawOutput = res.text;
    providerUsed = res.provider;
    validation = validateStudyHelpOutput(rawOutput);

    if (validation.valid) {
      return {
        success: true,
        content: validation.data,
        provider: providerUsed,
      };
    }
  } catch (retryErr: unknown) {
    // Retry error handled below
  }

  return {
    success: false,
    error: "The study assistant could not format a valid response for this material. Please try again.",
    provider: providerUsed,
    statusCode: 502,
  };
}
