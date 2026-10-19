/**
 * Agentic Skills Layer — Core Infrastructure
 *
 * This module provides the foundation for the LMS's internal skills engine.
 * Each skill is a composable, server-side function that can be invoked
 * programmatically by admin workflows, system triggers, or future LLM integrations.
 *
 * Skills follow a consistent pattern:
 * - Accept typed input parameters
 * - Return a `SkillResult<T>` with success/error/metadata
 * - Include permission checks internally
 * - Log execution for audit trails
 */

export interface SkillResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    executedAt: string;
    skillName: string;
    durationMs: number;
  };
}

/**
 * Wraps a skill function with standardized logging, timing, and error handling.
 */
export async function executeSkill<T>(
  skillName: string,
  fn: () => Promise<T>
): Promise<SkillResult<T>> {
  const start = Date.now();
  try {
    const data = await fn();
    return {
      success: true,
      data,
      metadata: {
        executedAt: new Date().toISOString(),
        skillName,
        durationMs: Date.now() - start,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown skill error";
    console.error(`[Skill:${skillName}] Error:`, message);
    return {
      success: false,
      error: message,
      metadata: {
        executedAt: new Date().toISOString(),
        skillName,
        durationMs: Date.now() - start,
      },
    };
  }
}

export { generateCourseCode } from "./generate-course-code";
export { bulkAssignInstructor } from "./bulk-assign-instructor";
export { enrollmentManager } from "./enrollment-manager";
export { flagSentiment } from "./sentiment-flagger";
export { resolveGroupPermissions } from "./group-permission-resolver";
export { exportGradebookSkill } from "./gradebook-exporter";
export { bulkUserIngestion } from "./bulk-user-ingestion";
