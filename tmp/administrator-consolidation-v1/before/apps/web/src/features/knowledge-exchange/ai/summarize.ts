/**
 * apps/web/src/features/knowledge-exchange/ai/summarize.ts
 */

import { callGemini } from "./gemini-client";

export interface SummarizeResult {
  summary: string;
  keyPoints: string[];
  success: boolean;
  error?: string;
  isUnavailable?: boolean;
}

export async function summarizeThread(
  title: string,
  body: string,
  answers: Array<{ authorName: string; body: string; isAccepted?: boolean; isVerified?: boolean }>
): Promise<SummarizeResult> {
  const answersText = answers
    .map(
      (a, i) =>
        `Answer #${i + 1} by ${a.authorName} ${a.isAccepted ? "[ACCEPTED]" : ""} ${
          a.isVerified ? "[VERIFIED]" : ""
        }:\n${a.body}`
    )
    .join("\n\n---\n\n");

  const prompt = `Summarize the following Q&A forum thread from the Institute of Computer Studies:

Question Title: ${title}
Question Body: ${body}

Community Answers (${answers.length}):
${answersText || "(No answers submitted yet)"}

Output a concise summary structured as follows:
- **Core Problem & Context** (2 sentences)
- **Key Takeaways & Consensus** (3-5 bullet points)
- **Resolved Status**: Whether the problem was solved or remains open.

Add this footer disclaimer:
"> *AI-Generated Summary: Synthesized from community discussions.*"`;

  const res = await callGemini(
    prompt,
    "You condense technical computer science discussions into clear executive summaries."
  );

  if (!res.success) {
    return {
      summary: "",
      keyPoints: [],
      success: false,
      error: res.error,
      isUnavailable: res.isUnavailable,
    };
  }

  return {
    summary: res.text,
    keyPoints: [],
    success: true,
  };
}
