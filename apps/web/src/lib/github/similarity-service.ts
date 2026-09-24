/**
 * similarity-service.ts
 *
 * Plagiarism & code similarity detection engine.
 * Strips comments, normalizes whitespace, masks variable identifiers,
 * and calculates token n-gram overlap (Jaccard Index) across submitted code files.
 */

export interface CodeFile {
  path: string;
  content: string;
}

export interface SimilarityResult {
  score: number;       // 0.00 to 100.00
  flagged: boolean;    // true if score >= threshold
  matchingTokensCount: number;
  totalTokensCount: number;
  fileBreakdown: Array<{
    fileA: string;
    fileB: string;
    similarity: number;
  }>;
}

const COMMON_KEYWORDS = new Set([
  'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
  'break', 'continue', 'const', 'let', 'var', 'class', 'extends', 'import',
  'export', 'from', 'default', 'new', 'try', 'catch', 'finally', 'throw',
  'async', 'await', 'def', 'elif', 'print', 'yield', 'lambda', 'public',
  'private', 'protected', 'static', 'void', 'int', 'float', 'double', 'boolean',
  'string', 'struct', 'interface', 'type', 'null', 'undefined', 'true', 'false'
]);

/**
 * Normalizes code content by stripping comments, string literals,
 * and normalizing non-keyword variable identifiers to ID_VAR.
 */
export function normalizeCode(raw: string): string[] {
  if (!raw) return [];

  // 1. Remove multi-line comments: /* ... */ or """ ... """
  let stripped = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  stripped = stripped.replace(/"""[\s\S]*?"""/g, '');

  // 2. Remove single-line comments: // ... or # ...
  stripped = stripped.replace(/\/\/.*$/gm, '');
  stripped = stripped.replace(/#.*$/gm, '');

  // 3. Normalize string literals to catch renamed string constants
  stripped = stripped.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, 'STR_LITERAL');

  // 4. Tokenize by punctuation, operators, words, and numbers
  const rawTokens = stripped
    .replace(/[^\w\s]/g, ' $& ')
    .split(/\s+/)
    .filter((t) => t.trim().length > 0);

  // 5. Normalize variable identifiers (non-keywords)
  return rawTokens.map((token) => {
    const lower = token.toLowerCase();
    if (COMMON_KEYWORDS.has(lower)) {
      return lower;
    }
    // Numbers and operators remain literal
    if (/^\d+$/.test(token) || /^[^\w\s]$/.test(token)) {
      return token;
    }
    // Identifiers mapped to standard token placeholder
    return 'ID_VAR';
  });
}

/**
 * Generates shingles (n-grams) of tokens.
 */
function generateTokenShingles(tokens: string[], n = 3): Set<string> {
  const shingles = new Set<string>();
  if (tokens.length < n) {
    if (tokens.length > 0) {
      shingles.add(tokens.join('_'));
    }
    return shingles;
  }

  for (let i = 0; i <= tokens.length - n; i++) {
    shingles.add(tokens.slice(i, i + n).join('_'));
  }
  return shingles;
}

/**
 * Calculates similarity between two code strings (0.00 - 100.00).
 * Combines token frequency similarity and n-gram shingle Jaccard index.
 */
export function calculateCodeSimilarity(codeA: string, codeB: string, nGramSize = 3): number {
  const tokensA = normalizeCode(codeA);
  const tokensB = normalizeCode(codeB);

  if (tokensA.length === 0 && tokensB.length === 0) return 100.0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0.0;

  // 1. Shingle Jaccard
  const shinglesA = generateTokenShingles(tokensA, nGramSize);
  const shinglesB = generateTokenShingles(tokensB, nGramSize);

  let intersection = 0;
  for (const shingle of shinglesA) {
    if (shinglesB.has(shingle)) {
      intersection++;
    }
  }

  const union = new Set([...shinglesA, ...shinglesB]).size;
  const shingleScore = union === 0 ? 0 : (intersection / union) * 100;

  // 2. Token frequency multiset overlap
  const freqA = new Map<string, number>();
  for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);

  let sharedTokenCount = 0;
  for (const t of tokensB) {
    const count = freqA.get(t) || 0;
    if (count > 0) {
      sharedTokenCount++;
      freqA.set(t, count - 1);
    }
  }

  const tokenFrequencyScore = (2 * sharedTokenCount / (tokensA.length + tokensB.length)) * 100;

  // Blended composite score
  const finalScore = Math.min(100.0, Math.round((shingleScore * 0.7 + tokenFrequencyScore * 0.3) * 100) / 100);
  return finalScore;
}

/**
 * Compares two multi-file submissions and returns aggregated similarity.
 */
export function compareSubmissions(
  submissionAFiles: CodeFile[],
  submissionBFiles: CodeFile[],
  threshold = 80.0
): SimilarityResult {
  const fileBreakdown: Array<{ fileA: string; fileB: string; similarity: number }> = [];
  let totalWeightedScore = 0;
  let totalComparisons = 0;

  for (const fileA of submissionAFiles) {
    const fileNameA = fileA.path.split('/').pop() || fileA.path;

    for (const fileB of submissionBFiles) {
      const fileNameB = fileB.path.split('/').pop() || fileB.path;

      const extA = fileNameA.split('.').pop();
      const extB = fileNameB.split('.').pop();
      if (extA !== extB) continue;

      const sim = calculateCodeSimilarity(fileA.content, fileB.content);
      if (sim > 15 || fileNameA === fileNameB) {
        fileBreakdown.push({
          fileA: fileA.path,
          fileB: fileB.path,
          similarity: sim,
        });
        totalWeightedScore += sim;
        totalComparisons++;
      }
    }
  }

  const averageScore = totalComparisons > 0 ? totalWeightedScore / totalComparisons : 0;
  const maxScore = fileBreakdown.length > 0 ? Math.max(...fileBreakdown.map((f) => f.similarity)) : 0;

  const finalScore = fileBreakdown.length > 0
    ? Math.round((maxScore * 0.7 + averageScore * 0.3) * 100) / 100
    : 0;

  return {
    score: finalScore,
    flagged: finalScore >= threshold,
    matchingTokensCount: totalComparisons,
    totalTokensCount: submissionAFiles.length + submissionBFiles.length,
    fileBreakdown,
  };
}
