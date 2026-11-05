import { Diagram, Part, BestScoresPayload, ScienceArea } from "./types";

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function getDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the minimum Euclidean distance between all anchor pairs in a diagram.
 * Used for automated quality verification to prevent overlapping markers.
 */
export function calculateMinAnchorDistance(diagram: Diagram): number {
  const parts = diagram.parts;
  if (parts.length < 2) return Infinity;

  let minDistance = Infinity;

  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const dist = getDistance(parts[i].anchor, parts[j].anchor);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }

  return minDistance;
}

/**
 * Curated distractors per science area for Hard Mode labeling challenges.
 */
export const AREA_DISTRACTORS: Record<ScienceArea, string[]> = {
  "Human anatomy": [
    "Coronary Sinus",
    "Carotid Artery",
    "Jugular Vein",
    "Spleen",
    "Duodenum",
    "Bronchus",
    "Trachea",
    "Pericardium",
  ],
  "Biological systems": [
    "Vacuole",
    "Peroxisome",
    "Endoplasmic Reticulum (General)",
    "Chlorophyll A",
    "Guard Cell",
    "Phloem",
    "Xylem",
    "Plasmodesmata",
  ],
  "Physical processes": [
    "Sublimation",
    "Deposition",
    "Resistor",
    "Capacitor",
    "Voltmeter",
    "Ammeter",
    "Inductor",
    "Percolation",
  ],
};

/**
 * Deterministic / seeded or randomized Fisher-Yates array shuffle.
 */
export function shuffleArray<T>(array: T[], rng = Math.random): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Prepares the word bank for the Label It mode.
 * In hard mode, adds exactly 2 plausible distractors without duplicates.
 */
export function shufflePartNames(
  parts: Part[],
  options?: {
    hardMode?: boolean;
    area?: ScienceArea;
    allTopicParts?: Part[];
    rng?: () => number;
  }
): string[] {
  const rng = options?.rng ?? Math.random;
  const names = parts.map((p) => p.name);

  if (!options?.hardMode) {
    return shuffleArray(names, rng);
  }

  const existingSet = new Set(names);
  const potentialDistractors: string[] = [];

  // Add from other topic parts if provided
  if (options.allTopicParts) {
    for (const p of options.allTopicParts) {
      if (!existingSet.has(p.name) && !potentialDistractors.includes(p.name)) {
        potentialDistractors.push(p.name);
      }
    }
  }

  // Add from area curated distractors
  if (options.area && AREA_DISTRACTORS[options.area]) {
    for (const d of AREA_DISTRACTORS[options.area]) {
      if (!existingSet.has(d) && !potentialDistractors.includes(d)) {
        potentialDistractors.push(d);
      }
    }
  }

  // Shuffle and pick exactly 2 distractors
  const shuffledDistractors = shuffleArray(potentialDistractors, rng);
  const selectedDistractors = shuffledDistractors.slice(0, 2);

  return shuffleArray([...names, ...selectedDistractors], rng);
}

/**
 * Evaluates student answers against diagram parts.
 */
export function scoreLabelingAnswers(
  answers: Record<string, string | null>,
  parts: Part[]
): {
  score: number;
  total: number;
  percentage: number;
  isComplete: boolean;
  results: Record<string, boolean>;
} {
  const total = parts.length;
  let score = 0;
  let filledCount = 0;
  const results: Record<string, boolean> = {};

  for (const part of parts) {
    const selected = answers[part.id];
    if (selected) {
      filledCount++;
      const isCorrect = selected.trim().toLowerCase() === part.name.trim().toLowerCase();
      results[part.id] = isCorrect;
      if (isCorrect) {
        score++;
      }
    } else {
      results[part.id] = false;
    }
  }

  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
  const isComplete = filledCount === total;

  return {
    score,
    total,
    percentage,
    isComplete,
    results,
  };
}

const STORAGE_VERSION = 1;

/**
 * Deserializes best score records from localStorage with fallback schema safety.
 */
export function deserializeBestScores(raw: string | null): BestScoresPayload {
  if (!raw) {
    return { version: STORAGE_VERSION, scores: {} };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.scores === "object") {
      return {
        version: typeof parsed.version === "number" ? parsed.version : STORAGE_VERSION,
        scores: parsed.scores,
      };
    }
  } catch {
    // ignore parse error
  }
  return { version: STORAGE_VERSION, scores: {} };
}

/**
 * Serializes best score records for localStorage.
 */
export function serializeBestScores(payload: BestScoresPayload): string {
  return JSON.stringify(payload);
}

