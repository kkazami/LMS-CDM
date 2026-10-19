/**
 * apps/web/src/features/knowledge-exchange/ai/draft-answer.ts
 */

import { callGemini } from "./gemini-client";

export interface DraftAnswerResult {
  draftAnswer: string;
  success: boolean;
  error?: string;
  isUnavailable?: boolean;
}

export async function draftAnswer(
  questionTitle: string,
  questionBody: string
): Promise<DraftAnswerResult> {
  const prompt = `You are a helpful Computer Science teaching assistant at the Institute of Computer Studies (ICS).
Draft a comprehensive, pedagogical answer to this student question.
Include:
- Clear conceptual explanation
- Code example in relevant language if applicable
- LaTeX mathematical formulation if applicable ($...$)
- A disclaimer at the bottom: "> *Note: This draft was generated with AI assistance. Please review and verify technical details before relying on it.*"

Question Title: ${questionTitle}
Question Details:
${questionBody}`;

  const res = await callGemini(
    prompt,
    "You are a computer science educator. Provide rigorous yet easy to understand explanations."
  );

  if (!res.success) {
    return {
      draftAnswer: "",
      success: false,
      error: res.error,
      isUnavailable: res.isUnavailable,
    };
  }

  return {
    draftAnswer: res.text,
    success: true,
  };
}
