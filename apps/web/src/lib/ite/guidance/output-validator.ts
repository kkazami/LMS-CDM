/**
 * apps/web/src/lib/ite/guidance/output-validator.ts
 *
 * Validates, parses, and sanitizes model output against StudyHelpContentSchema.
 * Strips all HTML to ensure safety against XSS or unwanted markup.
 */

import { StudyHelpContentSchema } from "./schemas";
import type { StudyHelpContent } from "./types";

export type ValidationResult =
  | { valid: true; data: StudyHelpContent }
  | { valid: false; error: string; rawText?: string };

/**
 * Strips any HTML tags from text.
 */
function stripHtml(text: string): string {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, "").trim();
}

/**
 * Recursively strips HTML tags from string values in an object or array.
 */
function sanitizeOutputStrings<T>(input: T): T {
  if (typeof input === "string") {
    return stripHtml(input) as unknown as T;
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeOutputStrings) as unknown as T;
  }
  if (input !== null && typeof input === "object") {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      res[k] = sanitizeOutputStrings(v);
    }
    return res as T;
  }
  return input;
}

/**
 * Extracts JSON text from model output, parses it, and validates against Zod schema.
 */
export function validateStudyHelpOutput(rawText: string): ValidationResult {
  if (!rawText || typeof rawText !== "string") {
    return { valid: false, error: "Empty model output received." };
  }

  // 1. Extract JSON substring
  let candidate = rawText.trim();
  const codeBlockMatch = candidate.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    candidate = codeBlockMatch[1].trim();
  } else {
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      candidate = candidate.slice(firstBrace, lastBrace + 1);
    }
  }

  // 2. Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (err: unknown) {
    return {
      valid: false,
      error: "Model output could not be parsed as valid JSON.",
      rawText,
    };
  }

  // 3. Strip HTML from all strings
  const sanitized = sanitizeOutputStrings(parsed);

  // 4. Validate with Zod schema
  const parsedResult = StudyHelpContentSchema.safeParse(sanitized);
  if (!parsedResult.success) {
    const issues = parsedResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
    return {
      valid: false,
      error: `Model output schema validation failed: ${issues}`,
      rawText,
    };
  }

  return {
    valid: true,
    data: parsedResult.data,
  };
}
