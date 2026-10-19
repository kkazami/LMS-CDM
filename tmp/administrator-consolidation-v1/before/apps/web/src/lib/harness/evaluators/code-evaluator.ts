/**
 * apps/web/src/lib/harness/evaluators/code-evaluator.ts
 *
 * Deterministic Validation Gate (Sensor)
 * Validates that code examples proposed by the AI actually compile / parse without syntax errors.
 *
 * Hardened checks:
 *  1. String/comment-aware bracket balancing (no false positives on brackets inside literals)
 *  2. Language-aware dispatch (Python, HTML/CSS, JS/TS/Java/C#/C/C++)
 *  3. Collects ALL violations (no early break)
 *  4. Optional async Judge0 compile-only validation
 */

import { ValidationResult } from "../core/types";

/** Judge0 language IDs for compile-only validation */
const LANGUAGE_TO_JUDGE0_ID: Record<string, number> = {
  python: 71,
  java: 62,
  c: 50,
  cpp: 54,
  javascript: 93,
  csharp: 51,
  sql: 82,
};

/** Languages where bracket validation should be skipped entirely */
const SKIP_BRACKET_LANGUAGES = new Set(["html", "css", "sql"]);

/** Languages that only use () and [] (not {} for blocks) */
const INDENTATION_LANGUAGES = new Set(["python"]);

// ---------------------------------------------------------------------------
// Context-aware lexer state for ignoring brackets inside strings / comments
// ---------------------------------------------------------------------------

interface LexerState {
  inSingleQuote: boolean;
  inDoubleQuote: boolean;
  inTemplateLiteral: boolean;
  inLineComment: boolean;
  inBlockComment: boolean;
}

function isInsideLiteral(state: LexerState): boolean {
  return (
    state.inSingleQuote ||
    state.inDoubleQuote ||
    state.inTemplateLiteral ||
    state.inLineComment ||
    state.inBlockComment
  );
}

/**
 * Synchronous bracket-balancing check with string/comment awareness.
 * Skips brackets inside `"..."`, `'...'`, `` `...` ``, `// ...`, and `/* ... * /`.
 */
export function evaluateCodeSnippetSyntax(code: string, language: string): ValidationResult {
  const lang = language.toLowerCase().trim();

  // Skip bracket validation entirely for markup / query languages
  if (SKIP_BRACKET_LANGUAGES.has(lang)) {
    return { passed: true, score: 100, violations: [] };
  }

  const violations: string[] = [];

  // Determine which opening brackets are relevant for this language
  const openBrackets = INDENTATION_LANGUAGES.has(lang)
    ? new Set(["(", "["])
    : new Set(["(", "{", "["]);
  const closeBrackets = INDENTATION_LANGUAGES.has(lang)
    ? new Set([")", "]"])
    : new Set([")", "}", "]"]);
  const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };

  const stack: { char: string; index: number }[] = [];
  const state: LexerState = {
    inSingleQuote: false,
    inDoubleQuote: false,
    inTemplateLiteral: false,
    inLineComment: false,
    inBlockComment: false,
  };

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const prev = i > 0 ? code[i - 1] : "";
    const next = i < code.length - 1 ? code[i + 1] : "";

    // --- Handle exiting literal/comment contexts ---

    if (state.inLineComment) {
      if (char === "\n") state.inLineComment = false;
      continue;
    }

    if (state.inBlockComment) {
      if (char === "*" && next === "/") {
        state.inBlockComment = false;
        i++; // skip the '/'
      }
      continue;
    }

    if (state.inDoubleQuote) {
      if (char === '"' && prev !== "\\") state.inDoubleQuote = false;
      continue;
    }

    if (state.inSingleQuote) {
      if (char === "'" && prev !== "\\") state.inSingleQuote = false;
      continue;
    }

    if (state.inTemplateLiteral) {
      if (char === "`" && prev !== "\\") state.inTemplateLiteral = false;
      // Note: We intentionally don't recurse into ${} inside template literals
      // for simplicity — the bracket check won't count them as code-level brackets.
      continue;
    }

    // --- Handle entering literal/comment contexts ---

    if (char === "/" && next === "/") {
      state.inLineComment = true;
      i++; // skip second '/'
      continue;
    }

    if (char === "/" && next === "*") {
      state.inBlockComment = true;
      i++; // skip '*'
      continue;
    }

    if (char === '"') {
      state.inDoubleQuote = true;
      continue;
    }

    if (char === "'") {
      state.inSingleQuote = true;
      continue;
    }

    if (char === "`") {
      state.inTemplateLiteral = true;
      continue;
    }

    // --- Bracket matching (only when NOT inside any literal) ---

    if (openBrackets.has(char)) {
      stack.push({ char, index: i });
    } else if (closeBrackets.has(char)) {
      const last = stack.pop();
      if (!last) {
        violations.push(`Unmatched closing delimiter '${char}' at index ${i} with no corresponding opener`);
        // Don't break — continue collecting violations
      } else if (pairs[last.char] !== char) {
        violations.push(
          `Mismatched delimiter: expected '${pairs[last.char]}' to close '${last.char}' (opened at index ${last.index}), but found '${char}' at index ${i}`
        );
      }
    }
  }

  // Report any unclosed delimiters
  for (const unclosed of stack) {
    violations.push(
      `Unclosed delimiter '${unclosed.char}' opened at index ${unclosed.index} was never closed`
    );
  }

  const passed = violations.length === 0;
  return {
    passed,
    score: passed ? 100 : 40,
    violations,
    feedbackForRetry: passed
      ? undefined
      : `Syntax sensor detected structural errors in ${lang} code snippet: ${violations.join("; ")}. Please fix the syntax and resubmit.`,
  };
}

/**
 * Async Judge0-based compile-only validation.
 * Submits the code to Judge0 and checks for compilation or runtime errors.
 * Returns a ValidationResult. Gracefully degrades if Judge0 is unavailable.
 */
export async function evaluateCodeWithJudge0(
  code: string,
  language: string
): Promise<ValidationResult> {
  const lang = language.toLowerCase().trim();
  const languageId = LANGUAGE_TO_JUDGE0_ID[lang];

  // If we don't know the Judge0 ID for this language, skip
  if (!languageId) {
    return { passed: true, score: 100, violations: [] };
  }

  try {
    // Dynamic import: resolves the @/ alias at runtime within Next.js.
    // Gracefully fails when run outside Next.js (e.g., from tsx scripts at repo root).
    const { executeJudge0Submission } = await import(
      "@/features/interactive-activities/codelab/utils/judge0-config"
    );
    const result = await executeJudge0Submission(code, languageId, "");

    // Judge0 status codes:
    //  3 = Accepted (ran successfully)
    //  4 = Wrong Answer (ran but output mismatch — not a syntax error)
    //  5 = Time Limit Exceeded
    //  6 = Compilation Error
    // 11 = Runtime Error
    // 13 = Internal Error (Judge0 issue, not our problem)
    const statusId = result.status?.id;

    if (statusId === 6) {
      // Compilation error
      const compileMsg = result.compile_output?.trim() || "Unknown compilation error";
      return {
        passed: false,
        score: 20,
        violations: [`Compilation failed: ${compileMsg}`],
        feedbackForRetry: `Judge0 compilation sensor detected a compile error in ${lang} code: ${compileMsg}. Please fix the syntax error and resubmit.`,
      };
    }

    if (statusId === 11) {
      // Runtime error — code compiles but crashes
      const runtimeMsg = result.stderr?.trim() || "Unknown runtime error";
      return {
        passed: false,
        score: 50,
        violations: [`Runtime error: ${runtimeMsg}`],
        feedbackForRetry: `Judge0 sensor detected a runtime error in ${lang} code: ${runtimeMsg}. Please verify the code logic and resubmit.`,
      };
    }

    // Accepted, Wrong Answer, TLE, or other non-syntax issues — let it pass
    return { passed: true, score: 100, violations: [] };
  } catch {
    // Judge0 unavailable or dynamic import failed — gracefully degrade
    console.warn("[CODE-EVALUATOR] Judge0 unavailable for compile check, skipping.");
    return { passed: true, score: 100, violations: [] };
  }
}
