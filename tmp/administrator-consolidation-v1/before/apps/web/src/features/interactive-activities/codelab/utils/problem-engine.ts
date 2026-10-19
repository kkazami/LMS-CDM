/**
 * problem-engine.ts
 *
 * Handles problem template parsing, variable substitution via deterministic
 * seed, and generating the final Markdown string for the student.
 */

// Simple deterministic RNG
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

export interface CodeLabVariable {
  name: string;
  type: "number" | "string";
  min?: number;
  max?: number;
  options?: string[];
}

export function evaluateVariables(seed: string, variables: CodeLabVariable[]): Record<string, string | number> {
  const rng = mulberry32(hashString(seed));
  const result: Record<string, string | number> = {};

  for (const v of variables) {
    if (v.type === "number" && v.min !== undefined && v.max !== undefined) {
      result[v.name] = Math.floor(rng() * (v.max - v.min + 1)) + v.min;
    } else if (v.type === "string" && v.options && v.options.length > 0) {
      const idx = Math.floor(rng() * v.options.length);
      result[v.name] = v.options[idx];
    } else {
      result[v.name] = 0; // fallback
    }
  }

  return result;
}

export function substituteTemplate(templateMarkdown: string, values: Record<string, string | number>): string {
  let result = templateMarkdown;
  for (const [key, val] of Object.entries(values)) {
    // Replace all occurrences of {{key}} with the value
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, String(val));
  }
  return result;
}
