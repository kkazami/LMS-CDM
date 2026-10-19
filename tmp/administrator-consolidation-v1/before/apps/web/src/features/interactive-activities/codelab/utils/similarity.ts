/**
 * similarity.ts
 *
 * Lightweight token-based similarity checker to flag potential plagiarism
 * across submissions for the same template. Strips whitespace, comments,
 * and performs Levenshtein distance on the resulting normalized strings.
 */

export function normalizeCode(code: string, language: string): string {
  let normalized = code;

  // 1. Remove comments
  if (language === "python") {
    normalized = normalized.replace(/#.*$/gm, "");
    normalized = normalized.replace(/'''[\s\S]*?'''/g, "");
    normalized = normalized.replace(/"""[\s\S]*?"""/g, "");
  } else {
    // C-style comments (JS, Java, C, C++)
    normalized = normalized.replace(/\/\/.*$/gm, "");
    normalized = normalized.replace(/\/\*[\s\S]*?\*\//g, "");
  }

  // 2. Remove string literals (they often differ arbitrarily or are the same in print statements)
  normalized = normalized.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  normalized = normalized.replace(/'(?:[^'\\]|\\.)*'/g, "''");

  // 3. Remove all whitespace
  normalized = normalized.replace(/\s+/g, "");

  return normalized;
}

// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculates similarity percentage between 0 and 100.
 */
export function calculateSimilarity(codeA: string, codeB: string, language: string): number {
  const normA = normalizeCode(codeA, language);
  const normB = normalizeCode(codeB, language);

  if (normA.length === 0 && normB.length === 0) return 100;
  if (normA.length === 0 || normB.length === 0) return 0;

  const dist = levenshtein(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  
  return ((maxLen - dist) / maxLen) * 100;
}
