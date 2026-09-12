/**
 * apps/web/src/lib/harness/guardrails/socratic-policy.ts
 *
 * Layer 2 Guardrail: Anti-Cheating & Socratic Pedagogical Policy
 * Enforces educational safety:
 *  1. Detects prompt injection / jailbreak attempts ("ignore instructions", "give me answer")
 *  2. Prevents the AI from outputting complete ready-to-submit code solutions
 *  3. Blocks extraction of hidden test cases or teacher answer keys
 */

import { GuardrailCheckResult } from "../core/types";

// Patterns that indicate student is attempting to bypass Socratic tutor
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions/i,
  /give\s+me\s+the\s+(entire|complete|full)\s+code/i,
  /solve\s+this\s+for\s+me/i,
  /what\s+are\s+the\s+hidden\s+tests/i,
  /show\s+me\s+the\s+test\s+cases/i,
  /print\s+the\s+hidden/i,
  /system\s*:\s*role/i,
];

// Patterns indicating agent violated Socratic rule by spoon-feeding
const DIRECT_SOLUTION_KEYWORDS = [
  "here is the complete code",
  "copy and paste this",
  "here is the complete solution",
  "full code implementation:",
  "just paste this into",
  "here is the exact code to pass",
];

export function inspectStudentInput(prompt: string): GuardrailCheckResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        allowed: false,
        guardrailName: "SocraticInputGuardrail",
        reason: "Input flagged: Prompts attempting to extract direct solutions or bypass educational guidelines are restricted.",
        severity: "BLOCK",
      };
    }
  }

  return {
    allowed: true,
    guardrailName: "SocraticInputGuardrail",
  };
}

export function inspectAgentOutput(output: string): GuardrailCheckResult {
  const lower = output.toLowerCase();

  // 1. Keyword check
  for (const keyword of DIRECT_SOLUTION_KEYWORDS) {
    if (lower.includes(keyword)) {
      return {
        allowed: false,
        guardrailName: "SocraticOutputGuardrail",
        reason: "Agent draft violated Socratic policy by providing direct copy-paste solution code.",
        severity: "RETRY",
      };
    }
  }

  // 2. Code verbosity check (AI tutor should only provide small hints <= 10 lines of code)
  const codeBlocks = output.match(/```[\s\S]*?```/g) || [];
  for (const block of codeBlocks) {
    const lines = block.split("\n").filter((l) => l.trim().length > 0);
    // If a single code block is longer than 15 lines, it's likely a full implementation rather than a hint
    if (lines.length > 15) {
      return {
        allowed: false,
        guardrailName: "SocraticOutputGuardrail",
        reason: "Agent draft contains a large code block (> 15 lines). Socratic tutor must only provide brief conceptual syntax hints.",
        severity: "RETRY",
      };
    }
  }

  return {
    allowed: true,
    guardrailName: "SocraticOutputGuardrail",
  };
}
