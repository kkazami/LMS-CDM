import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import nlp from "compromise";
import AdmZip from "adm-zip";

// ─── Types ───────────────────────────────────────────────────────────────────
interface RawCard {
  front: string;
  back: string;
  hint?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Slide titles to skip entirely (non-educational / instructional) */
const IGNORE_TITLES = [
  "activity", "task", "question", "objective", "objectives", "summary",
  "conclusion", "introduction", "assignment", "homework", "agenda",
  "overview", "outline", "table of contents", "references", "bibliography",
  "thank you", "thanks", "end", "questions", "review", "recap", "credits",
  "disclaimer", "definition", "definitions", "example", "examples", "glossary",
  "course overview", "grading system", "course description", "course policies",
  "policies", "about me", "about the instructor", "instructor", "course outline",
  "syllabus", "requirements", "course requirements", "house rules", "class rules",
  "learning outcomes", "learning outcome", "intended learning outcomes", 
  "intended learning outcome", "course objectives", "learning objectives"
];

/** Slide title prefixes to skip */
const IGNORE_PREFIXES = [
  "activity ", "task ", "question ", "module ", "lesson ", "unit ", "example ", "chapter ", "course ", "week "
];

/** Regex to detect meta/instructional headers that shouldn't become cards */
const META_HEADER_REGEX =
  /\b(note|notes|guide questions|guide question|quiz|activity|task|question|questions|objective|objectives|summary|conclusion|introduction|assignment|homework|agenda|lecture|module|unit|lesson|chapter|instructions|definition|definitions|example|examples|overview|outline|references|bibliography|glossary|index)\b/i;

/** Regex to detect instructional sentences that start with meta phrases */
const META_SENTENCE_START_REGEX =
  /^(?:(?:\d+(?:\.\d+)*|[a-zA-Z]|[ivxlIVXL]+)[.)]\s*)?(?:by the end of|at the end of|after this|upon completion|in this (?:lesson|chapter|module|unit|course)|students should be able to|learning objectives?|this (?:lesson|chapter|module|unit|course) (?:covers|will cover|introduces|explores|focuses on)|objectives?|agenda|outline|overview|study (?:each of|the following)|read (?:each of|the following)|review (?:each of|the following)|the following topics|please (?:read|study|review|note)|draw\b|write\b|create\b|list\b|mention\b|discuss\b|compare\b|explain\b|identify\b|describe\b|summarize\b|outline\b|provide\b|illustrate\b|demonstrate\b|show\b|state\b|answer\b|understand\b|evaluate\b|analyze\b|conduct\b|recognize\b|record\b|reflect\b|apply\b|design\b|develop\b|assess\b|determine\b)/i;

/** Regex to detect policy sentences (cheating, grading, etc.) ANYWHERE in the sentence */
const POLICY_SENTENCE_REGEX =
  /\b(?:academic integrity|academic dishonesty|cheating|plagiarism|violation of|penalty for|considered dropped|attend classes|accumulates absences|midterm examination|missed exam|makeup exam|make-up|written evidence|medium of communication|percentage distribution|grading system|lecture grade|laboratory grade)\b/i;

/** Regex to detect non-educational body lines (attributions, names, etc.) */
const NON_EDUCATIONAL_LINE_REGEX =
  /^(?:(?:presented|prepared|submitted|compiled|created|made|written|reported|developed|designed|facilitated)\s+by\b|(?:group|team)\s+(?:members?|\d)|(?:members?|authors?)\s*:|(?:prof\.?|engr\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+[A-Z]|\b(?:BSN|BSIT|BSCS|BSCE|BS\s|AB\s|MA\s|MBA)\b|^[A-Z][a-z]+(?:\s+[A-Z]\.?)+(?:\s+[A-Z][a-z]+)+$)/i;

/** Check if a line looks like a person's name (all title-case words, 2-8 words, no verbs/prepositions) */
function looksLikePersonName(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 5 || trimmed.length > 80) return false;
  const words = trimmed.split(/\s+/);
  // Allow up to 8 words to accommodate credentials (e.g., "John Doe, PhD, LPT")
  if (words.length < 2 || words.length > 8) return false;
  // All words start with uppercase
  const allTitleCase = words.every((w) => /^[A-Z]/.test(w));
  if (!allTitleCase) return false;
  // No common English words that would indicate a phrase, not a name
  const hasCommonWord = words.some((w) =>
    /^(the|and|for|with|from|that|this|are|was|were|has|have|its|but|not|can|will|into|over|such|than|them|then|also|each|much|most|more|some|very|just|only|both|used|make|made|like|been|does|done|being|about|after|these|those|which|where|there|their|other|would|could|should|every|under)$/i.test(w)
  );
  if (hasCommonWord) return false;
  // Contains a period after a single letter (initial) — strong name signal
  if (/\b[A-Z]\./i.test(trimmed)) return true;
  // Short enough to be a name (2-3 words)
  return words.length <= 3;
}

// ─── Varied Question Templates (Mixed Format) ────────────────────────────
// Combines 5W1H questions with other question styles for variety:
// imperative prompts (Define, Describe, Explain), comparison, and fill-in-blank.

/** Pool of definition-style question phrasings — 5W1H + additional styles */
const DEFINITION_TEMPLATES = [
  // 5W1H
  (s: string) => `What is ${s}?`,
  (s: string) => `What is the definition of ${s}?`,
  (s: string) => `What is meant by ${s}?`,
  (s: string) => `How is ${s} defined?`,
  (s: string) => `What does ${s} refer to?`,
  // Non-5W1H (Imperative / Statement)
  (s: string) => `Define ${s}.`,
  (s: string) => `Explain the concept of ${s}.`,
  (s: string) => `Describe ${s} in your own words.`,
  (s: string) => `In simple terms, explain ${s}.`,
  (s: string) => `Identify the key characteristics of ${s}.`,
  (s: string) => `Provide a detailed explanation of ${s}.`,
  (s: string) => `Elaborate on the meaning of ${s}.`,
  (s: string) => `State the definition of ${s}.`,
  // Fill-in-the-blank / Completion style
  (s: string) => `Complete the thought: The term ${s} refers to...`,
  (s: string) => `Briefly summarize the concept of ${s}.`,
];

/** Pool of topic-style question phrasings — 5W1H + additional styles */
const TOPIC_TEMPLATES = [
  // 5W1H
  (s: string) => `What is the significance of ${s}?`,
  (s: string) => `Why is ${s} important?`,
  (s: string) => `How does ${s} function?`,
  (s: string) => `What is the main purpose of ${s}?`,
  (s: string) => `What role does ${s} play?`,
  (s: string) => `How does ${s} impact the system?`,
  // Non-5W1H (Imperative / Statement)
  (s: string) => `Explain the role of ${s}.`,
  (s: string) => `Describe the function of ${s}.`,
  (s: string) => `Give an example that illustrates ${s}.`,
  (s: string) => `Summarize the key points of ${s}.`,
  (s: string) => `Discuss the importance of ${s}.`,
  (s: string) => `Compare ${s} with a related concept.`,
  (s: string) => `Outline the main aspects of ${s}.`,
  (s: string) => `Provide a brief overview of ${s}.`,
  (s: string) => `Elaborate on the topic of ${s}.`,
  // Fill-in-the-blank / Completion style
  (s: string) => `Complete the thought: The primary function of ${s} is...`,
];

/** Simple deterministic string hash (consistent across runs) */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Pick a varied default question based on a hash of subject + body.
 * Same inputs always produce the same output (reproducible), but different
 * inputs naturally spread across the template pool.
 */
function getDefaultQuestion(subject: string, body: string, isDefinition: boolean): string {
  const templates = isDefinition ? DEFINITION_TEMPLATES : TOPIC_TEMPLATES;
  const index = simpleHash(subject + body) % templates.length;
  return templates[index](subject);
}

/**
 * Content-aware question generator — inspects the answer text to pick the
 * most appropriate question type from diverse categories (5W1H + non-5W1H).
 */
function generateQuestion(subject: string, body: string, isDefinition: boolean = false): string {
  // If the subject is already a question, use it directly to prevent "question inception"
  if (subject.trim().endsWith("?")) {
    return subject.trim().replace(/\?+$/, "?"); // Ensure exactly one question mark
  }

  // List Item / Example: If the text starts with a list marker (e.g. "1.", "A)", "ii.")
  if (/^(?:\d+(?:\.\d+)*|[a-zA-Z]|[ivxlIVXL]+)[.)]\s/.test(body.trim())) {
    // If the subject is plural (ends with 's'), it's likely a list of examples/types
    if (subject.toLowerCase().endsWith("s")) {
      return `What is an example of ${subject}?`;
    }
    // Otherwise it's a key point or aspect
    return `What is a key aspect of ${subject}?`;
  }

  const b = body.toLowerCase();

  // Person / Attribution
  if (/(?:developed|invented|created|founded|introduced|proposed|discovered) by/i.test(b))
    return `Who developed ${subject}?`;

  // Temporal
  if (/\b(1[0-9]{3}|20[0-9]{2})\b/.test(b) ||
      /\b(year|century|period|era|decade|date)\b/i.test(b))
    return `When did ${subject} occur?`;

  // Location
  if (/\b(located|found in|region|country|area|continent|city|place)\b/i.test(b))
    return `Where is ${subject} located?`;

  // Cause / Effect
  if (/\b(because|therefore|causes?|leads? to|results? in|due to|consequence|effect)\b/i.test(b))
    return `What causes ${subject}?`;

  // Process / Steps
  if (/\b(first|then|next|finally|step|process|stage|phase|procedure)\b/i.test(b))
    return `How does the process of ${subject} work?`;

  // Comparison
  if (/\b(unlike|whereas|compared to|differ|contrast|while|however|distinction)\b/i.test(b))
    return `How does ${subject} differ from related concepts?`;

  // Example
  if (/\b(example|instance|such as|like|including|e\.g\.)\b/i.test(b))
    return `What is an example of ${subject}?`;

  // Purpose / Function
  if (/\b(used to|allows?|enables?|helps?|purpose|function|role of|serves?)\b/i.test(b))
    return `What is the purpose of ${subject}?`;

  // Significance / Importance
  if (/\b(important|significant|key|critical|essential|major|crucial|vital)\b/i.test(b))
    return `Why is ${subject} important?`;

  // Quantity / Types
  if (/\b(three|four|five|six|seven|eight|nine|ten|several|many|numerous|multiple)\s+(?:types?|kinds?|forms?|parts?|categories|components?)\b/i.test(b))
    return `How many types of ${subject} are there?`;

  // Default — varied definition/topic question (mixed 5W1H + non-5W1H format)
  return getDefaultQuestion(subject, body, isDefinition);
}

// ─── Deduplication ───────────────────────────────────────────────────────────

/** Normalize text for dedup comparison: lowercase, strip punctuation, collapse spaces */
function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Jaccard similarity on word sets — measures how much two strings overlap.
 * 0 = nothing in common, 1 = identical word sets.
 */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalizeForDedup(a).split(" ").filter(Boolean));
  const setB = new Set(normalizeForDedup(b).split(" ").filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const w of setA) { if (setB.has(w)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/**
 * Remove cards with:
 * 1. Near-identical front text (exact-normalized dedup)
 * 2. Near-duplicate backs (Jaccard > 0.65) — keep the shorter/better one
 */
function deduplicateCards(cards: RawCard[]): RawCard[] {
  // Step 1: dedup on normalized front, but aggregate backs for identical questions!
  const byFront = new Map<string, RawCard>();
  for (const card of cards) {
    const key = normalizeForDedup(card.front);
    if (!byFront.has(key)) {
      // Deep copy to avoid mutating the original array elements
      byFront.set(key, { ...card });
    } else {
      // The front is identical. Instead of dropping it, let's aggregate the back!
      const existing = byFront.get(key)!;
      if (jaccardSimilarity(existing.back, card.back) < 0.65) {
        // Format as a bulleted list if we are combining multiple answers
        if (!existing.back.startsWith("• ")) {
          existing.back = "• " + existing.back;
        }
        existing.back += "\n• " + card.back;
      }
    }
  }
  const unique = Array.from(byFront.values());

  // Step 2: Jaccard dedup on backs — O(n²) but n is small (≤ 70)
  const kept: RawCard[] = [];
  for (const card of unique) {
    let isDuplicate = false;
    for (const existing of kept) {
      if (jaccardSimilarity(card.back, existing.back) > 0.65) {
        // Keep the one with the shorter (more concise) back
        if (card.back.length < existing.back.length) {
          kept.splice(kept.indexOf(existing), 1, card);
        }
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) kept.push(card);
  }
  return kept;
}

// ─── Per-Card Quality Scoring ─────────────────────────────────────────────────
// Every generated card gets a score 0-10. Cards are sorted descending before
// the cap is applied, so only the highest-quality cards surface.

/** Filler phrases that, if present in a back, reduce quality */
const FILLER_BACK_PHRASES = [
  /\bit is important to note\b/i,
  /\bin this (?:lesson|chapter|module|unit|context|section)\b/i,
  /\bas we have seen\b/i,
  /\bthe following\b/i,
  /\bwe will (?:discuss|explore|examine|look at|learn)\b/i,
  /\bplease (?:note|refer|see|read)\b/i,
  /\bfor (?:more|further) (?:information|details?)\b/i,
];

function scoreCard(card: RawCard): number {
  let score = 5; // neutral baseline

  // +2: front is a proper question (5W1H) or recognized imperative prompt
  if (/^(what|how|why|when|where|who)\b/i.test(card.front.trim())) score += 2;
  else if (/^(define|explain|describe|identify|discuss|compare|summarize|give|in simple|provide|elaborate|state|complete|briefly|outline)\b/i.test(card.front.trim())) score += 2;

  // +2: back is concise (≤ 100 chars)
  if (card.back.length <= 100) score += 2;
  else if (card.back.length <= 160) score += 1;

  // +1: back contains a definition verb (high signal)
  if (/\b(is defined as|refers to|is known as|means|stands for|is characterized by)\b/i.test(card.back))
    score += 1;

  // +1: card has a hint
  if (card.hint && card.hint.trim().length > 5) score += 1;

  // −2: front contains meta words
  if (/\b(note|objective|activity|task|summary|review|agenda|outline)\b/i.test(card.front))
    score -= 2;

  // −2: back contains filler phrases
  if (FILLER_BACK_PHRASES.some(rx => rx.test(card.back))) score -= 2;

  // −1: back is very long (likely a paragraph dump)
  if (card.back.length > 300) score -= 1;

  // −3: front does NOT end with a question mark, period, or ellipsis (should be a question or imperative prompt)
  const f = card.front.trim();
  if (!f.endsWith("?") && !f.endsWith(".") && !f.endsWith("...")) score -= 3;

  return score;
}

// ─── Card Cap (Hard Limit: 10) ────────────────────────────────────────────────

/** Limit removed: extract all possible flashcards */
function getCardCap(_rawText: string): number {
  return Infinity;
}

/** Limit removed: extract all possible flashcards */
function getPptxCardCap(_slideCount: number): number {
  return Infinity;
}

// ─── Definition Pattern Registry (Fix 3 — Enhanced) ─────────────────────────

interface DefinitionPattern {
  regex: RegExp;
  subjectGroup: number;
  predicateGroup: number;
}

/**
 * Eight regex patterns that extract (subject, predicate) pairs from
 * definition-style sentences. Checked in order — first match wins.
 */
const DEFINITION_PATTERNS: DefinitionPattern[] = [
  // 1a. Strong definition verbs
  {
    regex:
      /^(.+?)\s+(?:is defined as|refers to|is known as|means|stands for)\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 1b. Generic verbs (is, are, was, were) - stricter match
  {
    regex:
      /^([A-Z][a-zA-Z0-9\s\-]{2,35})\s+(?:is|are|was|were)\s+(.+)$/,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 2. "X can be defined/described as Y"
  {
    regex: /^(.+?)\s+can be (?:defined|described) as\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 3. "X involves/consists of/comprises/includes/encompasses Y"
  {
    regex:
      /^(.+?)\s+(?:involves?|consists? of|comprises?|includes?|encompasses?)\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 4. "The term/concept/idea/principle of X is/refers to/means Y"
  {
    regex:
      /^(?:the (?:term|concept|idea|principle) (?:of )?)\s*(.+?)\s+(?:is|refers to|means)\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 5. "X was developed/invented/created/founded/introduced/proposed/discovered by Y"
  {
    regex:
      /^(.+?)\s+was (?:developed|invented|created|founded|introduced|proposed|discovered) by\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 6. "X is characterized/distinguished/marked by Y"
  {
    regex:
      /^(.+?)\s+(?:is characterized|is distinguished|is marked) by\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 7. "X occurs/happens/takes place when/during/in Y"
  {
    regex:
      /^(.+?)\s+(?:occurs?|happens?|takes? place) (?:when|during|in)\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
  // 8. "X represents/symbolizes/signifies/denotes Y"
  {
    regex:
      /^(.+?)\s+(?:represents?|symbolizes?|signifies?|denotes?)\s+(.+)$/i,
    subjectGroup: 1,
    predicateGroup: 2,
  },
];

// ─── Subject Cleaning Utilities ─────────────────────────────────────────────

/** Regex to reject pronoun/demonstrative/vague subjects that make nonsensical questions */
const JUNK_SUBJECT_REGEX =
  /^(this|that|it|its|they|these|those|he|she|we|you|our|their|some|many|all|few|most|both|each|every|any|other|another|such|more|several|here|there|the|a|an|sample|sample content|content|template)(\b|$)/i;

/**
 * Check if a subject is too vague/junk to make a good flashcard question.
 * Returns true if the subject should be rejected.
 */
function isJunkSubject(subject: string): boolean {
  const s = subject.trim();
  // Too short or too long
  if (s.length < 3 || s.length > 60) return true;
  // Just punctuation or numbers
  if (/^[\d\s.,:;\-!?()]+$/.test(s)) return true;
  // Contains an internal period (like "academic integrity. Academic dishonesty")
  if (/\w\.\s+[A-Z]/.test(s)) return true;
  // Contains multiple commas (like "family, sickness, or accident, written")
  if ((s.match(/,/g) || []).length >= 2) return true;
  // Ends with a trailing adjective, verb, or preposition
  if (/\b(written|given|taken|made|said|done|or|and|with|by|for|to|in|of|at)$/i.test(s)) return true;
  // Starts with a pronoun/demonstrative or junk word
  if (JUNK_SUBJECT_REGEX.test(s)) return true;
  // Generic meta terms
  if (/^(sample|content|sample content|topic|lesson|unit|chapter|section|part)\b/i.test(s)) return true;
  // Ends with a period and is very short (fragment like "These.")
  if (s.endsWith(".") && s.length < 10) return true;
  // Just a pronoun + common noun (e.g. "These tools", "This method", "Those items")
  if (/^(this|that|these|those|the|some|such)\s+\w+\.?$/i.test(s)) return true;
  return false;
}

/**
 * Clean a slide title or subject by stripping leading numbering, list markers,
 * "(Part N)" tags, and trailing punctuation to make it look natural in a question.
 */
function cleanSubject(text: string): string {
  return text
    // Strip leading list markers: "1. ", "A)", "ii.", "2.Printer" (even without space)
    .replace(/^(?:\d+|[a-zA-Z]|[ivxlIVXL]+)[.)\-:\]]\s*/, "")
    // Strip leading special characters/bullets (•, -, *, >, etc)
    .replace(/^[\u2022\u2023\u25E6\u2043\u2219*\-=>~]\s*/, "")
    // Strip "Part N", "continued", etc.
    .replace(/\s*\((?:part|pt\.?)\s*\d+\)/gi, "")
    .replace(/\s*\(continued\)/gi, "")
    .replace(/\s*\(cont['']?d?\.?\)/gi, "")
    .replace(/\s*[-–—]\s*(?:part|pt\.?)\s*\d+$/gi, "")
    // Strip trailing numbers that look like slide counts (e.g. "Title 1")
    .replace(/\s+\d+\s*$/, "")
    // Strip trailing punctuation
    .replace(/[.,:;!]+$/, "")
    .trim();
}

// ─── Ordered List Detection (Fix 4 — Enhanced) ──────────────────────────────

/** Matches numbered (1.), lettered (a.), and roman numeral (i.) list items */
const STEP_REGEX =
  /^(?:\d+[.\)]\s+|[a-zA-Z][.\)]\s+|[ivxlIVXL]+[.\)]\s+)(.{10,})/;

/**
 * Scans for consecutive ordered-list lines, groups them under the nearest
 * header, and produces summary + individual step cards.
 */
function detectOrderedLists(lines: string[], usedLines: Set<number>): RawCard[] {
  const cards: RawCard[] = [];
  let i = 0;

  while (i < lines.length) {
    if (usedLines.has(i)) {
      i++;
      continue; // ← Bug fix: skip to next iteration instead of falling through to stepStart = i
    }

    const stepStart = i;
    const steps: string[] = [];
    const matchedIndices: number[] = [];

    // Collect consecutive step lines
    while (i < lines.length) {
      if (usedLines.has(i)) break;
      const match = lines[i].match(STEP_REGEX);
      if (match) {
        steps.push(match[1].trim());
        matchedIndices.push(i);
        i++;
      } else {
        break;
      }
    }

    if (steps.length >= 2) {
      // Mark lines as used
      matchedIndices.forEach(idx => usedLines.add(idx));

      // Look back for a header to give context to the ordered list
      let header = "";
      if (stepStart > 0) {
        const prevLine = lines[stepStart - 1];
        if (
          prevLine.length > 3 &&
          prevLine.length < 80 &&
          !/[.?!]$/.test(prevLine)
        ) {
          header = cleanSubject(prevLine);
        }
      }

      // If we couldn't find a meaningful header, these flashcards will lack context
      // (e.g., "What are the steps of this process?"). Skip generating them.
      if (!header || isJunkSubject(header) || header.toLowerCase() === "this process") {
        continue;
      }

      // Summary card with arrow-separated steps (max 4)
      const summaryBack = steps.slice(0, 4).join(" → ");
      cards.push({
        front: `What are the steps of ${header}?`,
        back: summaryBack,
        hint: `There are ${steps.length} steps total.`,
      });

      // Individual step cards when 4+ steps
      if (steps.length >= 4) {
        steps.slice(0, 5).forEach((step, idx) => {
          cards.push({
            front: `What is step ${idx + 1} of ${header}?`,
            back: step,
          });
        });
      }
    } else {
      if (matchedIndices.length === 0) i++;
    }
  }

  return cards;
}

// ─── PPTX Slide-Level XML Parser (Fix 1 — Enhanced) ─────────────────────────
// Now generates one card per bullet point (not just the first), plus a
// summary card for slides with 3+ bullets. Uses content-aware question types.

/**
 * Extract a meaningful subject from bullet text for better question generation.
 * Tries definition patterns and colon-splits before falling back to slide title.
 * Returns null if no quality subject can be derived.
 */
function extractBulletSubject(bulletText: string, slideTitle: string): { subject: string; isDefinition: boolean } | null {
  // 1. Check for "Term: definition" pattern (ignoring leading markers)
  const cleanBullet = bulletText.replace(/^(?:\d+|[a-zA-Z]|[ivxlIVXL]+)[.)\-:\]]\s*/, "").trim();
  const colonMatch = cleanBullet.match(/^([A-Z][a-zA-Z0-9\s\-]{2,40})\s*[:–—]\s*(.+)$/i);
  if (colonMatch) {
    const term = cleanSubject(colonMatch[1]);
    if (!isJunkSubject(term)) {
      return { subject: term, isDefinition: true };
    }
  }

  // 2. Check for "X is/are/refers to Y" definition patterns
  for (const pattern of DEFINITION_PATTERNS) {
    const match = cleanBullet.match(pattern.regex);
    if (match) {
      const subject = cleanSubject(match[pattern.subjectGroup]?.trim() ?? "");
      if (!isJunkSubject(subject)) {
        return { subject, isDefinition: true };
      }
    }
  }

  // 3. Try to extract a leading noun phrase (first capitalized segment before a verb)
  const nounPhraseMatch = cleanBullet.match(/^([A-Z][a-zA-Z0-9\s\-]{3,35})(?:\s+(?:is|are|was|were|can|has|have|helps?|allows?|enables?|provides?|involves?)\b)/i);
  if (nounPhraseMatch) {
    const np = cleanSubject(nounPhraseMatch[1]);
    if (!isJunkSubject(np)) {
      return { subject: np, isDefinition: false };
    }
  }

  // 4. Fallback: use the cleaned slide title
  const cleanedTitle = cleanSubject(slideTitle);
  if (!isJunkSubject(cleanedTitle)) {
    return { subject: cleanedTitle, isDefinition: false };
  }

  // 5. No quality subject found — skip this bullet
  return null;
}

function parsePptxSlides(
  buffer: Buffer,
  allowedSlides?: Set<number> // 1-indexed slide numbers; undefined = all slides
): RawCard[] {
  const cards: RawCard[] = [];
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Filter only slide XML files (skip slideLayouts, slideMasters, etc.)
  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(
        a.entryName.match(/slide(\d+)/i)?.[1] ?? "0",
        10
      );
      const numB = parseInt(
        b.entryName.match(/slide(\d+)/i)?.[1] ?? "0",
        10
      );
      return numA - numB;
    });

  for (const entry of slideEntries) {
    // ── Slide-selection filter (Vaia-style page picker) ──
    const slideNumber = parseInt(
      entry.entryName.match(/slide(\d+)/i)?.[1] ?? "0",
      10
    );
    if (allowedSlides && !allowedSlides.has(slideNumber)) continue;

    const xml = entry.getData().toString("utf8");

    // Extract title text: look for <p:ph type="title" /> or <p:ph type="ctrTitle" />
    // then grab all <a:t> text within that shape
    let titleText = "";
    let bodyText = "";

    // Split XML into shape blocks <p:sp>...</p:sp>
    const shapeBlocks =
      xml.match(/<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/gi) || [];

    for (const shape of shapeBlocks) {
      const isTitle = /<p:ph[^>]*type\s*=\s*"(title|ctrTitle)"/i.test(
        shape
      );
      const isSubTitle = /<p:ph[^>]*type\s*=\s*"subTitle"/i.test(shape);

      // Extract all <a:t>...</a:t> text nodes from this shape
      const textNodes = shape.match(/<a:t>([^<]*)<\/a:t>/gi) || [];
      const shapeText = textNodes
        .map((t) => t.replace(/<\/?a:t>/gi, ""))
        .join(" ")
        .trim();

      if (!shapeText) continue;

      if (isTitle) {
        titleText += (titleText ? " " : "") + shapeText;
      } else if (isSubTitle) {
        bodyText += (bodyText ? "\n" : "") + shapeText;
      } else {
        bodyText += (bodyText ? "\n" : "") + shapeText;
      }
    }

    if (!titleText && bodyText) {
      const parts = bodyText.split("\n");
      titleText = parts[0].trim();
      bodyText = parts.slice(1).join("\n").trim();
    }

    titleText = titleText.replace(/:$/, "").trim();
    bodyText = bodyText.trim();

    // Ignore generic non-educational slides (expanded blocklist)
    const rawCleanTitle = titleText.replace(/[^a-zA-Z0-9\s]/g, "").trim().toLowerCase();
    if (
      IGNORE_TITLES.includes(rawCleanTitle) ||
      IGNORE_PREFIXES.some((p) => rawCleanTitle.startsWith(p))
    ) {
      continue;
    }

    // Split body into individual bullet/body points, filtering out junk
    const bodyPoints = bodyText
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => {
        // Too short: must be at least 2 words OR a capitalised single term ≥ 5 chars
        const wordCount = p.split(/\s+/).filter(Boolean).length;
        if (wordCount < 2 && p.length < 5) return false;
        if (p.length < 4) return false;
        // Non-educational lines (attributions, names, etc.)
        if (NON_EDUCATIONAL_LINE_REGEX.test(p)) return false;
        // Looks like a person's name
        if (looksLikePersonName(p)) return false;
        // Meta/instructional and policy sentences
        if (META_SENTENCE_START_REGEX.test(p) || POLICY_SENTENCE_REGEX.test(p)) return false;
        return true;
      });

    if (!titleText || bodyPoints.length === 0) continue;

    // ── Generate one card per bullet with content-aware questions ──
    for (const point of bodyPoints) {
      // Fast-path: "Term: Definition" or "Term — Definition" bullet
      // → generate "What is Term?" / "Term" answer directly
      const cleanPoint = point.replace(/^(?:\d+|[a-zA-Z]|[ivxlIVXL]+)[.)\-:\]]\s*/, "").trim();
      const termDefMatch = cleanPoint.match(
        /^([A-Z][a-zA-Z0-9\s\-]{1,35})\s*(?:[:–—]|-{2})\s*(.{10,})$/
      );
      if (termDefMatch) {
        const term = cleanSubject(termDefMatch[1]);
        const definition = termDefMatch[2].replace(/\.+$/, "").trim();
        if (!isJunkSubject(term) && definition.length >= 10) {
          cards.push({
            front: `What is ${term}?`,
            back: definition,
          });
          continue;
        }
      }

      const extracted = extractBulletSubject(point, titleText);
      // Skip bullets where no quality subject could be derived
      if (!extracted) continue;
      const { subject, isDefinition } = extracted;
      cards.push({
        front: generateQuestion(subject, point, isDefinition),
        back: point,
      });
    }

  }

  // Sort by quality score descending, apply dynamic cap, then dedup
  const cap = getPptxCardCap(slideEntries.length);
  return deduplicateCards(
    cards.sort((a, b) => scoreCard(b) - scoreCard(a))
  ).slice(0, cap);
}

// ─── Text → Flashcard Extraction (Enhanced Rule-Based NLP) ───────────────────
// Integrates: Fix 2 (varied questions), Fix 3 (expanded definitions),
// Fix 4 (ordered lists), Bonus (enumeration detection).

function processParagraph(paragraph: string, header: string, cards: RawCard[]) {
  const doc = nlp(paragraph);
  const sentences = doc.sentences().out("array") as string[];
  let matchedAny = false;

  for (let sIdx = 0; sIdx < sentences.length; sIdx++) {
    const sentence = sentences[sIdx];
    if (sentence.length < 20 || sentence.length > 250) continue;
    if (META_SENTENCE_START_REGEX.test(sentence.trim()) || POLICY_SENTENCE_REGEX.test(sentence)) continue;

    // A. Explicit Glossary / Definition Pattern
    // Strip leading list markers (e.g. "1. ", "a) ") to allow glossary matching on numbered lists
    const cleanSentence = sentence.replace(/^(?:\d+(?:\.\d+)*|[a-zA-Z]|[ivxlIVXL]+)[.)\-:\]]\s*/, "").trim();
    const glossaryMatch = cleanSentence.match(/^([A-Z][a-zA-Z0-9\s\-]{2,30})\s*(:| - |—)\s*(.+)$/i);
    if (glossaryMatch) {
      const term = cleanSubject(glossaryMatch[1]);
      const definition = glossaryMatch[3].replace(/\.$/, "").trim();
      if (!isJunkSubject(term) && definition.length > 5 && !META_HEADER_REGEX.test(term.replace(/[^a-zA-Z0-9\s]/g, "").trim())) {
        cards.push({ front: generateQuestion(term, definition, true), back: definition });
        matchedAny = true;
        continue;
      }
    }

    // B. Question & Answer Detection
    if (sentence.trim().endsWith("?")) {
      if (sIdx < sentences.length - 1) {
        const nextSentence = sentences[sIdx + 1];
        const isInstruction = /^(?:(?:\d+(?:\.\d+)*|[a-zA-Z]|[ivxlIVXL]+)[.)]\s*)?(?:mention|describe|explain|list|identify|discuss|compare|what|how|why)\b/i.test(nextSentence.trim());
        const isBullet = /^(?:(?:\d+(?:\.\d+)*|[a-zA-Z]|[ivxlIVXL]+)[.)]\s*)/.test(nextSentence.trim());
        
        if (!nextSentence.trim().endsWith("?") && nextSentence.length > 15 && nextSentence.length < 150 && !/^(this|that|it|they|these|those|he|she)\b/i.test(nextSentence.trim()) && !isInstruction && !isBullet) {
          cards.push({ front: sentence.trim(), back: nextSentence.trim() });
          matchedAny = true;
          continue;
        }
      }
    }

    // C. Enumeration Detection
    const enumMatch = sentence.match(/(?:there are|there exist|includes?|consists? of)\s+(?:(\w+)\s+)?(?:types?|kinds?|forms?|categories|parts?|components?|elements?|stages?|steps?|phases?|levels?)\s+(?:of\s+)?(.+?)(?::|,\s*namely|,\s*such as|,\s*including)\s*(.+)$/i);
    if (enumMatch) {
      const enumSubject = enumMatch[2]?.trim();
      const enumItems = enumMatch[3]?.replace(/\.$/, "").trim();
      if (enumSubject && enumItems && enumSubject.length > 2 && enumItems.length > 5) {
        cards.push({
          front: `What are the types of ${enumSubject}?`,
          back: enumItems,
          hint: enumMatch[1] ? `There are ${enumMatch[1]} of them.` : undefined,
        });
        matchedAny = true;
        continue;
      }
    }

    // D. Expanded Definition Triggers
    if (sentence.includes("?")) continue;
    let defMatched = false;
    for (const pattern of DEFINITION_PATTERNS) {
      const match = sentence.match(pattern.regex);
      if (!match) continue;
      let subject = match[pattern.subjectGroup]?.trim() ?? "";
      const predicate = match[pattern.predicateGroup]?.replace(/\.$/, "").trim() ?? "";
      // Clean pronouns and apply our global subject cleaner (strips numbering/bullets)
      subject = subject.replace(/^(this|that|these|those)\s+/i, "").replace(/\s+(this|that|it|they)$/i, "").trim();
      subject = cleanSubject(subject);
      
      if (isJunkSubject(subject) || subject.includes("?")) break;
      if (subject.length > 2 && subject.length < 50 && predicate.length > 10) {
        cards.push({ front: generateQuestion(subject, predicate, true), back: predicate });
        defMatched = true;
        matchedAny = true;
        break;
      }
    }
    if (defMatched) continue;
  }

  // E. Narrative Fallback
  // If no specific definitions or lists were found in this paragraph,
  // and it has MULTIPLE proper sentences (proving it's a real narrative, not a glued list of bullets),
  // create a summary card so we don't lose the historical/contextual information.
  if (!matchedAny && header && !isJunkSubject(header) && header.length > 3) {
    if (sentences.length >= 2 && paragraph.length >= 100 && paragraph.length <= 600) {
      cards.push({
        front: `Summarize the key points of ${cleanSubject(header)}.`,
        back: paragraph,
      });
      matchedAny = true;
    }
  }
}

function extractFlashcardsFromText(text: string): RawCard[] {
  const cards: RawCard[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => {
      // Strip standalone page numbers often found at the bottom of PDF slides
      if (/^\d+$/.test(l)) return false;
      // Strip common footers like "Prepared by: Name" or "Presented by: Name"
      if (/^(?:prepared|presented)\s+by\s*[:\w\s.,]*$/i.test(l)) return false;
      return true;
    });
  const usedLines = new Set<number>();

  // 1. Detect ordered/numbered/lettered/roman lists
  const orderedListCards = detectOrderedLists(lines, usedLines);
  cards.push(...orderedListCards);

  // 2. Block-Based Structural Parsing
  let currentHeader = "";
  let paragraphBuffer = "";

  const flushParagraph = () => {
    if (paragraphBuffer) {
      let cleanPara = paragraphBuffer.replace(/([^.?!])\n+/g, "$1 ").replace(/\n+/g, " ");
      cleanPara = cleanPara.replace(/\s+/g, " ").trim();
      processParagraph(cleanPara, currentHeader, cards);
      paragraphBuffer = "";
    }
  };

  for (let i = 0; i < lines.length; i++) {
    if (usedLines.has(i)) {
      flushParagraph();
      continue;
    }

    const line = lines[i];

    // Detect Bullet Points attached to the current header FIRST
    const bulletMatch = line.match(/^[\u2022\u2023\u25E6\u2043\-\*]\s+(.+)/);
    if (bulletMatch) {
      flushParagraph();
      const definition = bulletMatch[1].trim();
      if (definition.length > 5 && currentHeader) {
        cards.push({
          front: generateQuestion(cleanSubject(currentHeader), definition),
          back: definition,
        });
      }
      continue;
    }

    // Detect standalone Headers (strict heuristic to avoid wrapped lines)
    let isHeader = false;
    if (line.length > 3 && line.length <= 60 && !/[.?!;,]$/.test(line)) {
      const words = line.split(" ");
      const titleCaseWords = words.filter((w) => /^[A-Z]/.test(w));
      // A header must be mostly title case (>= 50%) and not start with a lowercase letter
      if (
        (titleCaseWords.length / words.length >= 0.5) &&
        !/^[a-z]/.test(line) &&
        !/\b(include|are|is|the|a|an|and|or|of|to|in|with|for|by|on|as|at|from)$/i.test(line)
      ) {
        isHeader = true;
      }
    }

    if (isHeader) {
      flushParagraph();
      const rawClean = line.replace(/[^a-zA-Z0-9\s]/g, "").trim().toLowerCase();
      
      // Check if this header should be completely ignored (e.g. "Course Policies")
      const isIgnored = IGNORE_TITLES.includes(rawClean) || IGNORE_PREFIXES.some(p => rawClean.startsWith(p));
      
      if (isIgnored) {
        currentHeader = "__IGNORE__";
      } else if (!META_HEADER_REGEX.test(rawClean)) {
        currentHeader = line
          .replace(/^(?:\d+(?:\.\d+)*[.)]\s+|[a-zA-Z][.)]\s+|[ivxlIVXL]+[.)]\s+)/, "")
          .replace(/:$/, "")
          .trim(); // Strip leading enumerations and trailing colons
      }
      continue;
    }

    // Accumulate paragraph text if not ignored
    if (currentHeader !== "__IGNORE__") {
      // ── Smart Slide Fragment Detection for PDFs ──
      // If the line is short (like a slide bullet) and we have a header,
      // try to extract a flashcard directly from it instead of waiting for a full paragraph.
      
      // Look ahead/behind to see if the line is just a wrapped sentence, not a bullet.
      let isWrapped = false;
      
      const connectingWords = "and|or|but|so|for|nor|yet|the|a|an|this|that|these|those|some|any|of|in|to|with|on|at|from|by|about|as|into|like|through|after|over|between|out|against|during|without|before|under|around|among|is|are|was|were|be|been|being|have|has|had|do|does|did|can|could|shall|should|will|would|may|might|must|which|who|whom|whose|such as";
      
      const endsWithRegex = new RegExp(`\\b(${connectingWords})\\s*$`, "i");
      const startsWithRegex = new RegExp(`^\\s*(${connectingWords})\\b`, "i");

      // 1. Line ends with a connecting word (meaning it continues to the next line)
      if (endsWithRegex.test(line)) {
        isWrapped = true;
      } 
      // 2. Line starts with a lowercase letter or connecting word (meaning it's continuing the previous line)
      else if (/^[a-z]/.test(line) || startsWithRegex.test(line)) {
        isWrapped = true;
      }
      // 3. Next line starts with a lowercase letter or connecting word
      else if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (/^[a-z]/.test(nextLine) || startsWithRegex.test(nextLine)) {
          isWrapped = true;
        }
      }

      if (!isWrapped && line.length >= 10 && line.length <= 150 && !/[.!?]$/.test(line)) {
        flushParagraph();
        const extracted = extractBulletSubject(line, currentHeader || "the topic");
        if (extracted && extracted.subject !== "the topic") {
          cards.push({
            front: generateQuestion(extracted.subject, line, extracted.isDefinition),
            back: line,
          });
        }
        continue;
      }

      paragraphBuffer += (paragraphBuffer ? " " : "") + line;
    }
  }
  flushParagraph();

  // Sort by quality score, deduplicate, apply dynamic cap
  const cap = getCardCap(text);
  return deduplicateCards(
    cards.sort((a, b) => scoreCard(b) - scoreCard(a))
  ).slice(0, cap);
}

/** Filler openers that add zero information to a flashcard back. */
const FILLER_OPENER_REGEX =
  /^(?:it is (?:important to note|worth noting) that\s*|in this (?:lesson|chapter|module|unit|context|section)[,.]?\s*|as we (?:have seen|discussed|learned)[,.]?\s*|this (?:refers to|is defined as|means that)\s*|the concept (?:of\s+\w+\s+)?refers to\s*|basically[,.]?\s*|essentially[,.]?\s*|simply put[,.]?\s*|in other words[,.]?\s*)/i;

// ─── Answer Shortener (Flashcard Best Practice) ─────────────────────────────
// Flashcard backs should be concise but complete — don't chop mid-thought.

function shortenAnswer(text: string): string {
  // ── 0. Strip filler openers before length check ──
  let cleaned = text.replace(FILLER_OPENER_REGEX, "").trim();
  // Capitalise first char after stripping
  if (cleaned.length > 0) cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);

  // Already concise — leave it intact
  if (cleaned.length <= 120) return cleaned;

  // ── 1. Try splitting on sentence-ending punctuation (best quality cut) ──
  const sentenceMatch = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentenceMatch) {
    const firstSentence = sentenceMatch[1].trim();
    if (firstSentence.length >= 15 && firstSentence.length <= 180) {
      return firstSentence.replace(/\.+$/, "").trim();
    }
    // First sentence is very long — truncate at a word boundary
    if (firstSentence.length > 180) {
      const truncated = firstSentence.slice(0, 160);
      const lastSpace = truncated.lastIndexOf(" ");
      return (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated)
        .replace(/[,;:\-]+$/, "")
        .trim();
    }
  }

  // ── 2. No punctuation (PPTX bullet text) — detect clause boundaries ──
  // When bullet points get concatenated, clause boundaries appear where a
  // lowercase char is followed by a new Uppercase-starting word:
  //   "...prototyping and iteration Prioritizes working software..."
  //                                ^── clause boundary here
  const clauseMatch = cleaned.match(/^(.{20,}?)(?<=[a-z,])\s+(?=[A-Z][a-z])/);
  if (clauseMatch && clauseMatch[1].length >= 20 && clauseMatch[1].length <= 160) {
    return clauseMatch[1].replace(/[,;:\-]+$/, "").trim();
  }

  // ── 3. Fallback: hard truncate at word boundary ──
  const truncated = cleaned.slice(0, 180);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated)
    .replace(/[,;:\-]+$/, "")
    .trim();
}

// ─── PDF Kerning Fix ─────────────────────────────────────────────────────────
// PDF and PPTX extractors often split words at glyph boundaries, producing
// artifacts like "Sof tware", "f ocused", "decision- making". This function
// detects and rejoins them.

/** Common 2–4 letter English words. If the left fragment IS one of these, we
 *  keep the space (it's a real word boundary, not a kerning split). */
const COMMON_SHORT_WORDS = new Set([
  // ── 2-letter ──
  'am','an','as','at','be','by','do','go','he','if','in','is','it','me','my',
  'no','of','on','or','so','to','up','us','we',
  // ── 3-letter ──
  'act','add','age','ago','aid','aim','air','all','and','any','are','arm','art',
  'ask','bad','bag','ban','bar','bat','bed','bet','big','bit','box','boy','bug',
  'bus','but','buy','cab','can','cap','car','cat','cop','cow','cry','cup','cut',
  'dad','day','did','die','dig','dog','dot','dry','due','ear','eat','egg','end',
  'era','eye','fan','far','fat','fed','fee','few','fit','fix','fly','fog','for',
  'fox','fun','fur','gap','gas','get','god','got','gun','gut','guy','gym','had',
  'has','hat','hay','hen','her','hid','him','hip','his','hit','hop','hot','how',
  'hub','hug','ice','ill','ink','inn','ion','its','jam','jar','jaw','jet','job',
  'joy','jug','key','kid','kin','kit','lab','lad','lag','lap','law','lay','led',
  'leg','let','lid','lie','lip','lit','log','lot','low','mad','man','map','mat',
  'max','may','men','met','mid','min','mix','mob','mom','mop','mud','mug','nap',
  'net','new','nil','nod','nor','not','now','nun','nut','oak','odd','off','oil',
  'old','one','opt','ore','our','out','owe','own','pad','pan','pat','pay','pea',
  'pen','per','pet','pie','pig','pin','pit','pod','pop','pot','pro','pub','pun',
  'put','rag','ram','ran','rap','rat','raw','ray','red','rib','rid','rig','rim',
  'rip','rob','rod','rot','row','rub','rug','run','rut','sad','sat','saw','say',
  'sea','set','sew','she','shy','sin','sip','sir','sit','six','ski','sky','sly',
  'sob','son','sow','soy','spa','spy','sub','sue','sum','sun','tab','tag','tan',
  'tap','tar','tax','tea','ten','the','thy','tie','tin','tip','toe','ton','too',
  'top','tow','toy','try','tub','tug','two','urn','use','van','vat','vet','via',
  'vow','war','was','wax','way','web','wed','wet','who','why','wig','win','wit',
  'woe','wok','won','woo','wow','yam','yap','yes','yet','you','zap','zen','zip',
  'zoo',
  // ── 4-letter ──
  'able','also','area','away','back','ball','band','bank','base','bath','bear',
  'beat','been','bell','belt','bend','best','bill','bird','blow','blue','boat',
  'body','bold','bomb','bond','bone','book','boot','bore','born','boss','both',
  'bowl','bulk','burn','busy','cafe','cage','cake','call','calm','came','camp',
  'card','care','case','cash','cast','cave','cell','chip','city','clap','clay',
  'clip','club','clue','coal','coat','code','coil','coin','cold','come','cook',
  'cool','cope','copy','cord','core','corn','cost','crew','crop','cure','curl',
  'cute','dare','dark','data','date','dawn','days','dead','deaf','deal','dear',
  'debt','deck','deed','deep','deer','deny','desk','diet','dirt','dish','disk',
  'dock','does','dome','done','doom','door','dose','down','drag','draw','drip',
  'drop','drug','drum','dual','dull','dumb','dump','dune','dusk','dust','duty',
  'each','earn','ease','east','easy','edge','else','emit','envy','epic','even',
  'ever','evil','exam','face','fact','fade','fail','fair','fake','fall','fame',
  'fare','farm','fast','fate','fear','feat','feed','feel','feet','fell','felt',
  'file','fill','film','find','fine','fire','firm','fish','fist','flag','flat',
  'fled','flew','flex','flip','flow','foam','fold','folk','fond','food','fool',
  'foot','ford','fore','fork','form','fort','foul','four','free','from','fuel',
  'full','fund','fury','fuse','fuss','gain','game','gang','gate','gave','gaze',
  'gear','gene','gift','girl','give','glad','glow','glue','goes','gold','golf',
  'gone','good','grab','gram','gray','grew','grey','grid','grim','grin','grip',
  'grow','gulf','guru','gust','hair','half','hall','halt','hand','hang','hard',
  'hare','harm','harp','hate','haul','have','haze','head','heal','heap','hear',
  'heat','heel','held','hell','help','here','hero','hide','high','hike','hill',
  'hint','hire','hold','hole','holy','home','hook','hope','horn','host','hour',
  'huge','hung','hunt','hurt','hush','hymn','icon','idea','inch','info','into',
  'iron','isle','item','jack','jail','jazz','jean','jerk','jest','jobs','join',
  'joke','jump','jury','just','keen','keep','kept','kick','kids','kill','kind',
  'king','kiss','kite','knee','knew','knit','knob','knot','know','lace','lack',
  'laid','lake','lamb','lame','lamp','land','lane','last','late','lawn','lead',
  'leaf','leak','lean','leap','left','lend','lens','less','liar','lied','lies',
  'life','lift','like','limb','lime','limp','line','link','lion','lips','list',
  'live','load','loaf','loan','lock','loft','logo','lone','long','look','loop',
  'lord','lose','loss','lost','loud','love','luck','lump','lung','lure','lurk',
  'lush','lust','made','mail','main','make','male','mall','malt','mane','many',
  'mare','mark','mask','mass','mast','mate','maze','meal','mean','meat','meet',
  'melt','memo','mend','menu','mere','mesh','mess','mild','mile','milk','mill',
  'mind','mine','mint','miss','mist','mock','mode','mold','mood','moon','more',
  'moss','most','moth','move','much','mule','muse','must','mute','myth','nail',
  'name','navy','near','neat','neck','need','nest','news','next','nice','nine',
  'node','none','noon','norm','nose','note','noun','numb','odds','omit','once',
  'only','onto','ooze','open','oral','oven','over','owed','pace','pack','page',
  'paid','pail','pain','pair','pale','palm','pane','park','part','pass','past',
  'path','peak','pear','peel','peer','pile','pine','pink','pipe','plan','play',
  'plea','plod','plot','plow','ploy','plug','plum','plus','poem','poet','pole',
  'poll','pond','pool','poor','pope','pork','port','pose','post','pour','pray',
  'prey','prop','pull','pulp','pump','pure','push','quit','quiz','race','rack',
  'rage','raid','rail','rain','rank','rare','rash','rate','read','real','reap',
  'rear','reed','reef','reel','rely','rent','rest','rice','rich','ride','rift',
  'ring','riot','ripe','rise','risk','road','roam','roar','robe','rock','rode',
  'role','roll','roof','room','root','rope','rose','rude','ruin','rule','rush',
  'rust','safe','sage','said','sail','sake','sale','salt','same','sand','sang',
  'sank','save','seal','seam','seat','seed','seek','seem','seen','self','sell',
  'send','sent','shed','ship','shop','shot','show','shut','sick','side','sift',
  'sigh','sign','silk','sing','sink','site','size','skim','skin','skip','slam',
  'slap','sled','slid','slim','slip','slit','slot','slow','slug','snap','snow',
  'soak','soap','soar','sock','soda','sofa','soft','soil','sold','sole','some',
  'song','soon','sore','sort','soul','soup','sour','span','spin','spit','spot',
  'star','stay','stem','step','stew','stir','stop','stub','such','suit','sure',
  'swap','swim','tabs','tack','tail','take','tale','talk','tall','tame','tank',
  'tape','task','taxi','team','tear','tell','temp','tend','tent','term','test',
  'text','than','that','them','then','they','thin','this','thus','tick','tidy',
  'tied','tier','tile','till','tilt','time','tiny','tire','toad','toil','told',
  'toll','tomb','tone','took','tool','tops','tore','torn','tour','town','trap',
  'tray','tree','trek','trim','trio','trip','trod','trot','true','tube','tuck',
  'tuft','tune','turf','turn','twin','type','ugly','undo','unit','upon','urge',
  'used','user','uses','vain','vale','vary','vast','veil','vein','verb','very',
  'vest','veto','vice','view','vine','visa','void','volt','vote','wade','wage',
  'wait','wake','walk','wall','wand','want','ward','warm','warn','warp','wary',
  'wash','wasp','wave','wavy','weak','wean','wear','weed','week','well','went',
  'were','west','what','when','whom','wick','wide','wife','wild','will','wilt',
  'wind','wine','wing','wink','wipe','wire','wise','wish','wisp','with','woke',
  'wolf','wood','wool','word','wore','work','worm','worn','wove','wrap','wren',
  'yard','yarn','yeah','year','yell','your','zeal','zero','zone','zoom',
]);

/**
 * Fix common PDF/PPTX text-extraction kerning artifacts.
 *
 * Handles three classes of broken text:
 *  1. Hyphen-space  → "decision- making"  →  "decision-making"
 *  2. Single-char   → "f ocused"          →  "focused"
 *  3. Multi-char    → "Sof tware"         →  "Software"
 */
function fixPdfKerning(text: string): string {
  // 1. Hyphen-space: "decision- making" → "decision-making"
  //    Keep "real-world use" intact — only rejoin if the next word is NOT
  //    a recognized standalone word.
  let result = text;
  result = result.replace(
    /(\w)-\s+([a-zA-Z]+)/g,
    (match, left: string, rightWord: string) => {
      if (COMMON_SHORT_WORDS.has(rightWord.toLowerCase())) return match;
      // NLP backup: check if the right word is a recognized word type
      const doc = nlp(rightWord.toLowerCase());
      if (isNlpRecognizedWord(doc)) return match;
      return left + "-" + rightWord;
    },
  );

  // 2. Single-char splits (excluding "a"/"I" and possessives like "AI's")
  //    The lookbehind prevents joining "s accuracy" when preceded by an apostrophe.
  result = result.replace(
    /(?<![''\u2019])\b([bcdefghjklmnopqrstuvwxyzBCDEFGHJKLMNOPQRSTUVWXYZ])\s+([a-z]{2,})\b/g,
    (match, ch: string, rest: string) => {
      // Safety: if the right side is a recognized word on its own, keep separate
      if (COMMON_SHORT_WORDS.has(rest.toLowerCase())) return match;
      const doc = nlp(rest.toLowerCase());
      if (isNlpRecognizedWord(doc)) {
        // Only join if the combined form is also a recognized word
        const combinedDoc = nlp((ch + rest).toLowerCase());
        if (isNlpRecognizedWord(combinedDoc)) return ch + rest;
        return match;
      }
      return ch + rest;
    },
  );

  // 3. Multi-char splits: use NLP to validate BOTH fragments before joining.
  //    Only join when NEITHER side is a recognized word (= kerning artifact).
  //    e.g. "Sof tware" → neither is a word → join ✓
  //         "serve different" → both are words → keep separate ✓
  //         "model parameters" → "parameters" is #Plural → keep separate ✓
  result = result.replace(
    /\b([A-Za-z]{2,6})\s+([a-z]{2,})\b/g,
    (match, left: string, right: string) => {
      const leftLower = left.toLowerCase();
      const rightLower = right.toLowerCase();

      // Fast path: check common word list
      if (COMMON_SHORT_WORDS.has(leftLower) || COMMON_SHORT_WORDS.has(rightLower)) {
        return match;
      }

      // NLP check: is the left fragment a recognized word?
      const leftDoc = nlp(leftLower);
      if (isNlpRecognizedWord(leftDoc)) return match;

      // NLP check: is the right fragment a recognized word?
      const rightDoc = nlp(rightLower);
      if (isNlpRecognizedWord(rightDoc)) return match;

      // Neither side is a recognized word → likely a kerning artifact → join
      return left + right;
    },
  );

  return result;
}

/**
 * Check if compromise NLP recognizes a word as a specific part of speech.
 * Compromise defaults unknown words to generic Noun/Singular — we deliberately
 * skip that check so unknown fragments like "Sof" or "tware" are NOT considered
 * recognized. Only words with specific POS tags (Verb, Adjective, Plural, etc.)
 * that compromise assigns from its lexicon are treated as "known".
 */
function isNlpRecognizedWord(doc: ReturnType<typeof nlp>): boolean {
  return (
    doc.has('#Verb') || doc.has('#Adjective') || doc.has('#Adverb') ||
    doc.has('#Preposition') || doc.has('#Conjunction') || doc.has('#Determiner') ||
    doc.has('#Pronoun') || doc.has('#Copula') || doc.has('#Modal') ||
    doc.has('#QuestionWord') || doc.has('#Plural') || doc.has('#Uncountable') ||
    doc.has('#Demonym') || doc.has('#Possessive')
  );
}

// ─── Format Sanitizer / Quality Filter / Auto-Hint (Fix 5) ──────────────────
// Cleans formatting artifacts, drops broken cards, and auto-generates hints
// for cards that don't already have one.

function sanitizeCards(cards: RawCard[]): RawCard[] {
  return cards
    .map((card) => {
      let cleanFront = card.front
        .replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+/, "") // Strip leading bullets
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFFFD\u200B\u2028\u2029\uE000-\uF8FF]/g, "") // Remove control chars, unknown glyphs, zero-width spaces
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'") // Decode HTML entities
        .replace(/\s+/g, " ") // Normalize spaces
        .trim();

      // Fix PDF/PPTX kerning artifacts ("Sof tware" → "Software", "decision- making" → "decision-making")
      cleanFront = fixPdfKerning(cleanFront);

      // Strip weird trailing punctuation from the front (like colons before question marks)
      cleanFront = cleanFront.replace(/:\?$/, "?").replace(/:$/, "");

      let cleanBack = card.back
        .replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+/, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFFFD\u200B\u2028\u2029\uE000-\uF8FF]/g, "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/^(?:Note|Important|Remember|Notice)(?:\s+that)?[:\-]?\s*/i, "")
        .replace(/\s+/g, " ")
        .trim();

      // Fix PDF/PPTX kerning artifacts
      cleanBack = fixPdfKerning(cleanBack);

      // Fix "Wall of Text" — shorten to concise flashcard-friendly length
      cleanBack = shortenAnswer(cleanBack);

      return {
        front: cleanFront,
        back: cleanBack,
        hint: undefined,
      };
    })
    .filter((card) => {
      // Drop cards with empty or too-short content (junk labels)
      if (card.front.length < 10 || card.back.length < 10) return false;
      // Drop cards where the back is just a parenthesized label (e.g. '(RAD MODEL)')
      if (/^\(.*\)$|^\[.*\]$/.test(card.back.trim())) return false;
      // Drop cards where front is excessively long (likely a paragraph, not a question)
      if (card.front.length > 200) return false;
      // Drop cards where back is excessively long (walls of text)
      if (card.back.length > 500) return false;
      // Drop cards that are just numbers or page markers
      if (/^\d+$/.test(card.front) || /^page\s*\d+$/i.test(card.front))
        return false;
      // Drop cards that are just author/group attributions or closing remarks
      if (
        /^(by|prepared by|presented by|submitted by|group)\s+[a-z0-9\s]+$/i.test(
          card.back
        )
      )
        return false;
      // Drop Bible verses, quotes, and closing remarks
      const bibleRefRegex = /[1-3]?\s*(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|Samuel|Kings|Chronicles|Ezra|Nehemiah|Esther|Job|Psalms?|Proverbs?|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|Corinthians|Galatians|Ephesians|Philippians|Colossians|Thessalonians|Timothy|Titus|Philemon|Hebrews|James|Peter|Jude|Revelation)\s+\d+[:\d\-,\s]*/i;
      const bibleVersionRegex = /\b(NIV|KJV|NKJV|ESV|NLT|NASB|CSB|RSV|NRSV|ASV|MSG|AMP|CEV|GNT|TLB)\b/;
      if (
        bibleRefRegex.test(card.front) ||
        bibleRefRegex.test(card.back) ||
        bibleVersionRegex.test(card.front) ||
        bibleVersionRegex.test(card.back) ||
        /(thank you|god bless|any questions\?|questions\?)/i.test(card.front) ||
        /(thank you|god bless|any questions\?|questions\?)/i.test(card.back) ||
        /^(?:"|").+(?:"|")$/.test(card.back)
      )
        return false;
      return true;
    });
}

// ─── API Route Handler ───────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      attachmentId,
      courseId,
      save,
      deckTitle,
      deckColor,
      // Vaia-style page/slide selection filters (optional)
      pageFrom,   // PDF: first page to include (1-indexed) — legacy range
      pageTo,     // PDF: last page to include (1-indexed, inclusive) — legacy range
      selectedPages,  // PDF: array of 1-indexed page numbers to include (Vaia-style picker)
      selectedSlides, // PPTX: array of 1-indexed slide numbers to include
    } = body as {
      attachmentId: string;
      courseId: string;
      save?: boolean;
      deckTitle?: string;
      deckColor?: string;
      cards?: RawCard[];
      pageFrom?: number;
      pageTo?: number;
      selectedPages?: number[];
      selectedSlides?: number[];
    };

    if (!attachmentId || !courseId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // ── Save mode: the frontend already has the cards, just persist them ──
    if (save && body.cards) {
      const cardsToSave = body.cards as RawCard[];
      if (cardsToSave.length === 0) {
        return NextResponse.json(
          { message: "No cards to save" },
          { status: 400 }
        );
      }

      const deck = await db.flashcardDeck.create({
        data: {
          title: deckTitle || "Auto-Generated Flashcards",
          description: `Generated from course material`,
          creatorId: session.user.id,
          instituteId: (session.user as Record<string, unknown>)
            .instituteId as string,
          courseId: courseId,
          ...(deckColor && { color: deckColor }),
          cards: {
            create: cardsToSave.map((card, index) => ({
              front: card.front,
              back: card.back,
              hint: card.hint || "",
              orderIndex: index,
            })),
          },
        },
      });

      return NextResponse.json(
        { deckId: deck.id, saved: true },
        { status: 201 }
      );
    }

    // ── Preview mode: parse the file and return the cards for editing ──
    const enrollment = await db.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId: session.user.id },
      },
    });

    if (!enrollment || enrollment.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId },
      include: { syllabusItem: true },
    });

    if (!attachment || attachment.type !== "FILE") {
      return NextResponse.json(
        { message: "Attachment not found or is not a file" },
        { status: 404 }
      );
    }

    // Fetch the file
    let fileUrl = attachment.url;
    if (fileUrl.startsWith("/")) {
      const baseUrl = new URL(req.url).origin;
      fileUrl = `${baseUrl}${fileUrl}`;
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file from storage (Status: ${response.status})`
      );
    }

    const fileNameLower = attachment.fileName.toLowerCase();
    let generatedCards: RawCard[] = [];

    try {
      if (fileNameLower.endsWith(".pptx")) {
        // ── PPTX: Slide-level XML parsing with optional slide filter ──
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const allowedSlides =
          Array.isArray(selectedSlides) && selectedSlides.length > 0
            ? new Set(selectedSlides.map(Number))
            : undefined;
        generatedCards = parsePptxSlides(buffer, allowedSlides);
      } else if (fileNameLower.endsWith(".pdf")) {
        // ── PDF: Rule-based NLP text extraction with optional page filter ──
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfParse = require("pdf-parse/lib/pdf-parse.js");

        // Determine which pages to include:
        // 1. selectedPages (Vaia-style individual page picks) takes priority
        // 2. pageFrom/pageTo (legacy range) as fallback
        // 3. All pages if neither is provided
        const allowedPages: Set<number> | null =
          Array.isArray(selectedPages) && selectedPages.length > 0
            ? new Set(selectedPages.map(Number))
            : null;

        const fromPage = !allowedPages && typeof pageFrom === "number" && pageFrom >= 1 ? pageFrom : 1;
        const toPage = !allowedPages && typeof pageTo === "number" && pageTo >= fromPage ? pageTo : Infinity;
        const isFiltered = allowedPages !== null || fromPage > 1 || toPage < Infinity;

        if (isFiltered) {
          // Collect text only from allowed pages
          const pageTexts: string[] = [];
          await pdfParse(buffer, {
            pagerender: (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: { str: string }[] }> }) => {
              const pageNum = pageData.pageIndex + 1; // pageIndex is 0-based

              // Check if this page is in the allowed set
              if (allowedPages) {
                if (!allowedPages.has(pageNum)) return Promise.resolve("");
              } else {
                if (pageNum < fromPage || pageNum > toPage) return Promise.resolve("");
              }

              return pageData.getTextContent().then(
                (content: any) => {
                  let lastY: number | undefined;
                  let text = "";
                  for (const item of content.items) {
                    if (lastY === item.transform[5] || lastY === undefined) {
                      text += item.str;
                    } else {
                      text += "\n" + item.str;
                    }
                    lastY = item.transform[5];
                  }
                  pageTexts.push(text);
                  return text;
                }
              );
            },
          });
          generatedCards = extractFlashcardsFromText(pageTexts.join("\n"));
        } else {
          // No filter — original fast path
          const pdfData = await pdfParse(buffer);
          generatedCards = extractFlashcardsFromText(pdfData.text);
        }
      } else if (
        fileNameLower.endsWith(".txt") ||
        fileNameLower.endsWith(".csv")
      ) {
        const rawText = await response.text();
        generatedCards = extractFlashcardsFromText(rawText);
      } else if (fileNameLower.endsWith(".docx")) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const officeparser = require("officeparser");
        // Typed options object — avoids `as any` per strict-typing rule
        interface OfficeParserOptions { fileType: string; }
        const officeOptions: OfficeParserOptions = { fileType: "docx" };
        const ast = await officeparser.parseOffice(buffer, officeOptions);
        generatedCards = extractFlashcardsFromText(ast.toText());
      } else {
        return NextResponse.json(
          {
            message:
              "Unsupported file type. Only .pdf, .pptx, .docx, and .txt files can be converted to flashcards.",
          },
          { status: 400 }
        );
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error parsing file:", e);
      return NextResponse.json(
        { message: `Failed to parse file content. Error: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Run the sanitizer / quality filter / auto-hint
    generatedCards = sanitizeCards(generatedCards);

    if (generatedCards.length === 0) {
      return NextResponse.json(
        {
          message:
            "Could not extract any flashcards from this file. The document may not contain clear definitions, terms, or structured slide content. Try a more text-heavy document.",
        },
        { status: 400 }
      );
    }

    // Return preview JSON — the frontend will display these for editing
    return NextResponse.json({
      cards: generatedCards,
      fileName: attachment.fileName,
      cardCount: generatedCards.length,
    });
  } catch (error) {
    console.error("Auto-generate flashcards error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
