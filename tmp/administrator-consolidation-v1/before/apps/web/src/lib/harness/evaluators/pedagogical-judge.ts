/**
 * apps/web/src/lib/harness/evaluators/pedagogical-judge.ts
 *
 * Inferential / Heuristic Validation Gate
 * Evaluates the pedagogical quality of the AI response before delivery to the student.
 *
 * Hardened checks:
 *  1. Substantive question detection (not just "?", requires ≥5 words and rejects throwaway questions)
 *  2. Topic-relevance heuristic via keyword overlap (Jaccard similarity on non-stopword tokens)
 *  3. Push violations for ALL deductions (including encouragement)
 *  4. Score clamping to 0-100
 *  5. Consistent .trim().length for both short and long checks
 */

import { ValidationResult } from "../core/types";

// Common English stop words to exclude from topic-relevance matching
const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "just", "don", "now", "and", "but", "or", "if", "while", "because",
  "until", "about", "what", "which", "who", "whom", "this", "that",
  "these", "those", "am", "it", "its", "he", "she", "they", "them",
  "his", "her", "my", "your", "our", "their", "i", "me", "we", "you",
  "him", "us", "let", "let's", "get", "got", "also", "like", "make",
  "know", "see", "look", "take", "come", "go", "say", "said", "well",
  "much", "still", "even", "new", "want", "give", "use",
]);

// Throwaway questions that don't demonstrate Socratic depth
const THROWAWAY_QUESTION_PATTERNS = [
  /^ok\?$/i,
  /^right\?$/i,
  /^yes\?$/i,
  /^no\?$/i,
  /^really\?$/i,
  /^sure\?$/i,
  /does\s+that\s+make\s+sense\?/i,
  /you\s+know\??/i,
  /understand\??$/i,
  /got\s+it\??$/i,
  /see\s+what\s+i\s+mean\??/i,
  /makes?\s+sense\??$/i,
  /clear\??$/i,
  /any\s+questions?\??$/i,
];

/**
 * Extracts meaningful tokens from text (lowercase, non-stopword, ≥2 chars).
 */
function extractKeyTokens(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

/**
 * Computes Jaccard similarity between two sets: |A ∩ B| / |A ∪ B|.
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Checks if the response contains at least one substantive question.
 * A substantive question must:
 *  - End with "?"
 *  - Have at least 5 words before the "?"
 *  - Not match any throwaway pattern
 */
function hasSubstantiveQuestion(response: string): boolean {
  // Extract all sentences ending with "?"
  const sentences = response.split(/[.!?\n]+/).map((s) => s.trim());
  const questionSentences: string[] = [];

  // Also find question marks in the raw text and extract surrounding context
  const questionMarkIndices: number[] = [];
  for (let i = 0; i < response.length; i++) {
    if (response[i] === "?") questionMarkIndices.push(i);
  }

  if (questionMarkIndices.length === 0) return false;

  // For each "?", extract the sentence leading up to it
  for (const qIdx of questionMarkIndices) {
    // Walk backwards to find sentence start (previous sentence-ending punctuation or start of string)
    let start = qIdx;
    while (start > 0 && !['.', '!', '?', '\n'].includes(response[start - 1])) {
      start--;
    }
    const sentence = response.slice(start, qIdx).trim();
    if (sentence.length > 0) questionSentences.push(sentence);
  }

  // Check each question sentence for substance
  for (const sentence of questionSentences) {
    // Check it's not a throwaway
    const isThrowaway = THROWAWAY_QUESTION_PATTERNS.some((p) => p.test(sentence + "?"));
    if (isThrowaway) continue;

    // Must have at least 5 words
    const wordCount = sentence.split(/\s+/).filter((w) => w.length > 0).length;
    if (wordCount >= 5) return true;
  }

  return false;
}

export function evaluatePedagogicalQuality(
  response: string,
  studentPrompt?: string
): ValidationResult {
  const violations: string[] = [];
  let score = 100;
  const trimmedResponse = response.trim();

  // 1. Substantive question check (replaces simple "?" check)
  if (!hasSubstantiveQuestion(response)) {
    violations.push(
      "Response lacks a substantive guiding question (≥5 words, not a throwaway like 'OK?' or 'Does that make sense?') to prompt student reflection."
    );
    score -= 25;
  }

  // 2. Length check: Too brief (< 50 chars) or excessively verbose (> 3000 chars)
  //    Uses .trim().length consistently for both checks
  if (trimmedResponse.length < 50) {
    violations.push("Response is too abrupt and lacks constructive educational context.");
    score -= 30;
  } else if (trimmedResponse.length > 3000) {
    violations.push("Response is overly verbose and risks cognitive overload.");
    score -= 15;
  }

  // 3. Positive tone check — now pushes a violation for retry feedback
  const encouragementWords = [
    "notice", "think about", "check", "consider", "try",
    "what happens when", "great", "good", "well done", "interesting",
    "explore", "experiment", "observe", "compare", "reflect",
  ];
  const hasEncouragement = encouragementWords.some((word) =>
    response.toLowerCase().includes(word)
  );
  if (!hasEncouragement) {
    violations.push(
      "Response lacks encouraging or guiding language (e.g., 'notice', 'consider', 'try', 'explore'). Socratic responses should use positive, inviting tone."
    );
    score -= 10;
  }

  // 4. Topic-relevance check (only when student prompt is provided)
  if (studentPrompt && studentPrompt.trim().length > 0) {
    const promptTokens = extractKeyTokens(studentPrompt);
    const responseTokens = extractKeyTokens(response);

    // Only check relevance if the prompt has enough content to compare
    if (promptTokens.size >= 2) {
      const similarity = jaccardSimilarity(promptTokens, responseTokens);

      if (similarity < 0.03) {
        violations.push(
          `Response appears off-topic: very low keyword overlap with the student's question (similarity: ${(similarity * 100).toFixed(1)}%). The response may not address what the student asked.`
        );
        score -= 30;
      } else if (similarity < 0.08) {
        violations.push(
          `Response may be tangentially related to the student's question (similarity: ${(similarity * 100).toFixed(1)}%). Consider addressing the student's specific concern more directly.`
        );
        score -= 15;
      }
    }
  }

  // 5. Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  const passed = score >= 70;

  return {
    passed,
    score,
    violations,
    feedbackForRetry: passed
      ? undefined
      : `Pedagogical evaluation failed (score ${score}/100). Deficiencies: ${violations.join("; ")}. Ensure you ask a substantive reflective guiding question (not a throwaway) to stimulate the student's own problem solving, and directly address their specific question.`,
  };
}
