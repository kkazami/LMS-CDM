/**
 * apps/web/src/lib/harness/core/types.ts
 *
 * Core TypeScript schemas for the Lumina LMS AI Harness.
 * Follows the 3 Concentric Layers + Human Oversight architecture:
 *   - Layer 1: Tool Orchestration
 *   - Layer 2: Guardrails & Safety
 *   - Layer 3: Observability
 *   - Outer: Human Oversight
 */

export type InstituteCode = "ics" | "ibe" | "ite";
export type UserRole = "STUDENT" | "PROFESSOR" | "TEACHER" | "ADMIN";

/**
 * Authenticated runtime context injected into every agent invocation.
 * The agent cannot escape this boundary.
 */
export interface AgentContext {
  userId: string;
  instituteCode: InstituteCode;
  instituteId: string;
  role: UserRole;
  courseId?: string;
  sessionId?: string;
}

/**
 * Definition of a safe, callable tool within Layer 1.
 */
export interface ToolDefinition<TArgs = any, TOutput = any> {
  name: string;
  description: string;
  parametersSchema?: any; // Zod or JSON schema
  requiredRoles?: UserRole[];
  execute: (args: TArgs, context: AgentContext) => Promise<ToolExecutionResult<TOutput>>;
}

export interface ToolExecutionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}

/**
 * Guardrail check outcome (Layer 2)
 */
export interface GuardrailCheckResult {
  allowed: boolean;
  guardrailName: string;
  reason?: string;
  severity?: "WARNING" | "BLOCK" | "RETRY";
}

/**
 * Validation evaluation outcome (Layer 2 & Evaluator)
 */
export interface ValidationResult {
  passed: boolean;
  score: number; // 0 to 100
  violations: string[];
  feedbackForRetry?: string;
}

/**
 * Rubric scores from the LLM-as-Judge evaluator (Gate 4)
 */
export interface LLMJudgeRubricScores {
  relevance: number;      // 0-25: Does the response address the student's question?
  correctness: number;    // 0-25: Are code hints and explanations factually correct?
  socraticQuality: number; // 0-25: Does it guide without spoon-feeding?
  clarity: number;        // 0-25: Is the response clear and well-structured?
}


/**
 * High-Stakes Action for Human Oversight (Outer Ring)
 */
export interface OversightCheckpoint {
  id: string;
  actionType: "GRADE_SUBMISSION" | "DISCIPLINARY_FLAG" | "PUBLISH_ANNOUNCEMENT" | "MODIFY_COURSE";
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  proposedPayload: Record<string, any>;
  studentId: string;
  reviewerId?: string;
  createdAt: Date;
}

/**
 * Observability Trace Record (Layer 3)
 */
export interface AgentTraceRecord {
  id: string;
  timestamp: string;
  userId: string;
  instituteCode: InstituteCode;
  prompt: string;
  attempts: number;
  totalDurationMs: number;
  toolsCalled: string[];
  guardrailViolations: string[];
  validationScore: number;
  llmJudgeScores?: LLMJudgeRubricScores;
  finalResponse: string;
  status: "SUCCESS" | "GUARDRAIL_REJECTED" | "RETRIES_EXHAUSTED" | "ERROR";
}

/**
 * Runner Execution Options
 */
export interface AgentRunnerOptions {
  prompt: string;
  context: AgentContext;
  maxRetries?: number;
  systemDirective?: string;
  tools?: string[];
  requireHumanApproval?: boolean;
}
