import type { VocabularyWordItem } from "./types";

export interface VocabularySearchFilters {
  categorySlug?: string;
  partOfSpeech?: string;
  difficulty?: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes query string and generates common spelling variants
 * (such as transpositions between "ei" and "ie", e.g., "heirar" -> "hierar").
 */
function getQueryVariants(rawQuery: string): string[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const variants = [q];

  if (q.includes("ei")) {
    const flipped = q.replace(/ei/g, "ie");
    if (!variants.includes(flipped)) variants.push(flipped);
  }
  if (q.includes("ie")) {
    const flipped = q.replace(/ie/g, "ei");
    if (!variants.includes(flipped)) variants.push(flipped);
  }

  return variants;
}

/**
 * Calculates a match score specifically for the headword (word title).
 * Lower score = higher relevance (0 is exact match).
 * Returns -1 if the headword does NOT match.
 */
export function getHeadwordMatchScore(
  wordItem: VocabularyWordItem,
  queryLower: string
): number {
  const variants = getQueryVariants(queryLower);
  if (variants.length === 0) return 0;

  const wordLower = wordItem.word.toLowerCase();
  const qLen = variants[0]!.length;
  const tokens = wordLower.split(/[\s\-_/]+/);

  for (const v of variants) {
    // 1. Exact match
    if (wordLower === v) {
      return 0;
    }

    // 2. Exact prefix match
    if (wordLower.startsWith(v)) {
      return 10;
    }

    // Single-letter query: strictly requires the headword to start with that letter
    if (qLen === 1) {
      continue;
    }

    // 3. Word boundary prefix match (for hyphenated or multi-word terms)
    if (tokens.some((token) => token.startsWith(v))) {
      return 15;
    }

    // 4. Substring match inside the headword (only for queries with >= 2 characters)
    if (wordLower.includes(v)) {
      return 20;
    }
  }

  return -1;
}

/**
 * Calculates a match score for synonyms or informal equivalents.
 * Returns -1 if no synonym matches.
 */
export function getSynonymMatchScore(
  wordItem: VocabularyWordItem,
  queryLower: string
): number {
  const variants = getQueryVariants(queryLower);
  if (variants.length === 0) return -1;

  const qLen = variants[0]!.length;
  if (qLen === 1) return -1; // Single-letter queries do not match synonyms

  const synonyms = (wordItem.synonyms || []).map((s) => s.toLowerCase());
  const informal = (wordItem.informalEquivalent ?? "").toLowerCase();

  for (const v of variants) {
    if (synonyms.some((s) => s === v)) return 30;
    if (synonyms.some((s) => s.startsWith(v))) return 35;
    if (informal === v || informal.startsWith(v)) return 38;
    if (synonyms.some((s) => s.includes(v))) return 40;
    if (informal.includes(v)) return 45;
  }

  return -1;
}

/**
 * Calculates a match score for definition or usage context.
 * Only applicable for queries with 3+ characters when searching for concepts.
 */
export function getDefinitionMatchScore(
  wordItem: VocabularyWordItem,
  queryLower: string
): number {
  const q = queryLower.trim().toLowerCase();
  if (q.length < 3) return -1;

  const simpleDef = wordItem.simpleDefinition.toLowerCase();
  const formalDef = wordItem.formalDefinition.toLowerCase();
  const usage = wordItem.usageContext.toLowerCase();

  const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(q)}\\b`, "i");
  if (wordBoundaryRegex.test(simpleDef) || wordBoundaryRegex.test(formalDef)) {
    return 60;
  }

  if (
    simpleDef.includes(q) ||
    formalDef.includes(q) ||
    usage.includes(q)
  ) {
    return 70;
  }

  return -1;
}

/**
 * Compatibility helper returning the overall match score.
 */
export function scoreVocabularyWordMatch(
  wordItem: VocabularyWordItem,
  queryLower: string
): number {
  const hw = getHeadwordMatchScore(wordItem, queryLower);
  if (hw >= 0) return hw;

  const syn = getSynonymMatchScore(wordItem, queryLower);
  if (syn >= 0) return syn;

  return getDefinitionMatchScore(wordItem, queryLower);
}

/**
 * Filters and ranks a list of vocabulary words against a query and optional filters.
 *
 * HEADWORD DOMINANCE LOGIC:
 * If ANY headword matches the search query (e.g. typing "hierar" or "heirar" matches
 * "Hierarchical" and "Hierarchy"), ONLY the headword matches are returned.
 * Completely unrelated entries that only matched through a synonym or definition
 * (such as "Taxonomy") are strictly excluded from the result set.
 */
export function rankAndFilterVocabularyWords(
  words: VocabularyWordItem[],
  searchQuery: string,
  filters?: VocabularySearchFilters
): VocabularyWordItem[] {
  const q = searchQuery.trim().toLowerCase();
  const catFilter =
    filters?.categorySlug && filters.categorySlug !== "ALL"
      ? filters.categorySlug
      : null;
  const posFilter =
    filters?.partOfSpeech && filters.partOfSpeech !== "ALL"
      ? filters.partOfSpeech
      : null;
  const diffFilter =
    filters?.difficulty && filters.difficulty !== "ALL"
      ? filters.difficulty
      : null;

  // Pre-filter by metadata (category, part of speech, difficulty)
  const candidates = words.filter((w) => {
    if (catFilter && w.categorySlug !== catFilter) return false;
    if (posFilter && w.partOfSpeech !== posFilter) return false;
    if (diffFilter && w.difficulty !== diffFilter) return false;
    return true;
  });

  if (!q) {
    // Alphabetical order when no search query
    return candidates.slice().sort((a, b) => a.word.localeCompare(b.word));
  }

  const headwordMatches: Array<{ item: VocabularyWordItem; score: number }> = [];
  const synonymMatches: Array<{ item: VocabularyWordItem; score: number }> = [];
  const definitionMatches: Array<{ item: VocabularyWordItem; score: number }> = [];

  for (const item of candidates) {
    const hwScore = getHeadwordMatchScore(item, q);
    if (hwScore >= 0) {
      headwordMatches.push({ item, score: hwScore });
      continue;
    }

    const synScore = getSynonymMatchScore(item, q);
    if (synScore >= 0) {
      synonymMatches.push({ item, score: synScore });
      continue;
    }

    if (q.length >= 3) {
      const defScore = getDefinitionMatchScore(item, q);
      if (defScore >= 0) {
        definitionMatches.push({ item, score: defScore });
      }
    }
  }

  // Headword Dominance: If direct headword matches exist, return ONLY headword matches
  let finalMatches: Array<{ item: VocabularyWordItem; score: number }>;
  if (headwordMatches.length > 0) {
    finalMatches = headwordMatches;
  } else if (synonymMatches.length > 0) {
    finalMatches = synonymMatches;
  } else {
    finalMatches = definitionMatches;
  }

  finalMatches.sort((a, b) => {
    // 1. Primary sort: lower score comes first (exact matches, then prefix matches, etc.)
    if (a.score !== b.score) {
      return a.score - b.score;
    }

    // 2. Alphabetical A-Z sort within the same relevance tier
    return a.item.word.localeCompare(b.item.word);
  });

  return finalMatches.map((s) => s.item);
}
