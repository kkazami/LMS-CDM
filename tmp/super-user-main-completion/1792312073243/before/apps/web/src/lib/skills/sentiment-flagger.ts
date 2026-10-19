"use server";

import { executeSkill } from "./index";
import type { SkillResult } from "./index";

interface SentimentResult {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  flagged: boolean;
  triggers: string[];
}

// Basic keyword-based sentiment detection (pluggable — replace with LLM call)
const NEGATIVE_TRIGGERS = [
  "failing",
  "terrible",
  "awful",
  "worst",
  "hate",
  "angry",
  "frustrated",
  "disappointed",
  "struggling",
  "hopeless",
  "unfair",
  "complaint",
  "concerned",
  "worried",
  "behind",
  "poor performance",
  "not participating",
  "absent",
  "missing",
  "incomplete",
  "plagiarism",
  "cheating",
  "academic dishonesty",
];

const POSITIVE_TRIGGERS = [
  "excellent",
  "outstanding",
  "impressive",
  "great job",
  "well done",
  "improved",
  "exceptional",
  "brilliant",
  "talented",
  "exceeded",
  "top performer",
  "remarkable",
  "commendable",
];

/**
 * Agentic Skill: Sentiment Flagger
 *
 * Analyzes private comment content and flags sentiment.
 * Currently uses a keyword-based approach — designed to be pluggable
 * so it can be swapped with an LLM-based analyzer in the future.
 *
 * When negative sentiment is detected, the comment is flagged for
 * instructor/admin visibility and potential follow-up.
 */
export async function flagSentiment(
  content: string
): Promise<SkillResult<SentimentResult>> {
  return executeSkill("flagSentiment", async () => {
    const lowerContent = content.toLowerCase();

    const matchedNegative = NEGATIVE_TRIGGERS.filter((trigger) =>
      lowerContent.includes(trigger)
    );
    const matchedPositive = POSITIVE_TRIGGERS.filter((trigger) =>
      lowerContent.includes(trigger)
    );

    let sentiment: SentimentResult["sentiment"] = "neutral";
    let confidence = 0.5;

    if (matchedNegative.length > matchedPositive.length) {
      sentiment = "negative";
      confidence = Math.min(0.5 + matchedNegative.length * 0.15, 0.95);
    } else if (matchedPositive.length > matchedNegative.length) {
      sentiment = "positive";
      confidence = Math.min(0.5 + matchedPositive.length * 0.15, 0.95);
    }

    return {
      sentiment,
      confidence,
      flagged: sentiment === "negative" && confidence >= 0.6,
      triggers: [...matchedNegative, ...matchedPositive],
    };
  });
}
