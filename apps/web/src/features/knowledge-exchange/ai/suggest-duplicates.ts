/**
 * apps/web/src/features/knowledge-exchange/ai/suggest-duplicates.ts
 */

import { db } from "@/lib/db";
import { callGemini } from "./gemini-client";

export interface DuplicateSuggestion {
  id: string;
  title: string;
  similarityScore: number;
  snippet: string;
}

export interface DuplicateCheckResult {
  duplicates: DuplicateSuggestion[];
  success: boolean;
  error?: string;
  isUnavailable?: boolean;
}

export async function suggestDuplicates(
  title: string,
  instituteId: string
): Promise<DuplicateCheckResult> {
  if (!title || title.trim().length < 5) {
    return { duplicates: [], success: true };
  }

  // 1. Fetch recent questions from this institute
  const recentPosts = await db.kxPost.findMany({
    where: {
      instituteId,
      isDeleted: false,
    },
    select: {
      id: true,
      title: true,
      body: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  if (recentPosts.length === 0) {
    return { duplicates: [], success: true };
  }

  // First check simple title token overlap
  const titleTokens = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);

  const matched = recentPosts
    .map((p) => {
      const pTitle = p.title.toLowerCase();
      let matches = 0;
      for (const t of titleTokens) {
        if (pTitle.includes(t)) matches++;
      }
      return {
        id: p.id,
        title: p.title,
        similarityScore: titleTokens.length > 0 ? matches / titleTokens.length : 0,
        snippet: p.body.slice(0, 140) + "...",
      };
    })
    .filter((p) => p.similarityScore > 0.3)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 5);

  // If Gemini is available, we can further refine semantic similarity
  const geminiAvailable = Boolean(process.env.GEMINI_API_KEY?.trim());
  if (!geminiAvailable) {
    return { duplicates: matched, success: true };
  }

  try {
    const postSummaries = recentPosts
      .slice(0, 10)
      .map((p, idx) => `${idx + 1}. [ID: ${p.id}] ${p.title}`)
      .join("\n");

    const prompt = `New draft question: "${title}"
Existing forum questions:
${postSummaries}

Identify if any existing questions address the same topic or are duplicates. Return a JSON array with up to 3 matches:
[{"id": "...", "similarityScore": 0.85, "reason": "brief reason"}]
Return empty array [] if no duplicates. Output strictly pure JSON.`;

    const res = await callGemini(prompt, "You output pure JSON arrays only.");
    if (res.success && res.text) {
      const cleaned = res.text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const enhanced = parsed
          .map((item: { id: string; similarityScore?: number }) => {
            const original = recentPosts.find((p) => p.id === item.id);
            if (!original) return null;
            return {
              id: original.id,
              title: original.title,
              similarityScore: item.similarityScore || 0.8,
              snippet: original.body.slice(0, 140) + "...",
            };
          })
          .filter(Boolean) as DuplicateSuggestion[];

        if (enhanced.length > 0) {
          return { duplicates: enhanced, success: true };
        }
      }
    }
  } catch {
    // Fallback to token matching
  }

  return { duplicates: matched, success: true };
}
