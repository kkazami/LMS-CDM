/**
 * apps/web/src/features/knowledge-exchange/ai/improve-question.ts
 */

import { callGemini } from "./gemini-client";

export interface ImprovedQuestionResult {
  suggestedTitle: string;
  improvedBody: string;
  explanation: string;
  success: boolean;
  error?: string;
  isUnavailable?: boolean;
}

export async function improveQuestion(
  title: string,
  body: string
): Promise<ImprovedQuestionResult> {
  const prompt = `You are a computer science teaching assistant at the Institute of Computer Studies (ICS).
Help a student improve their technical question to be clearer, more specific, and better formatted.

Current Title: ${title}
Current Body:
${body}

Return a JSON object strictly in this format (no markdown code blocks, just raw json):
{
  "suggestedTitle": "clear and concise question title",
  "improvedBody": "structured markdown with code blocks, math formatting where appropriate, and specific problem details",
  "explanation": "brief note on what was improved"
}`;

  const res = await callGemini(prompt, "You format output as pure JSON.");

  if (!res.success) {
    return {
      suggestedTitle: title,
      improvedBody: body,
      explanation: "",
      success: false,
      error: res.error,
      isUnavailable: res.isUnavailable,
    };
  }

  try {
    // Strip possible markdown backticks
    const cleaned = res.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return {
      suggestedTitle: parsed.suggestedTitle || title,
      improvedBody: parsed.improvedBody || body,
      explanation: parsed.explanation || "Improved clarity and technical formatting.",
      success: true,
    };
  } catch {
    // If JSON parsing fails, return raw text as improvedBody
    return {
      suggestedTitle: title,
      improvedBody: res.text,
      explanation: "Enhanced formatting.",
      success: true,
    };
  }
}
