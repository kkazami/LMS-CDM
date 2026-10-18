/**
 * apps/web/src/lib/harness/observability/trace-logger.ts
 *
 * Layer 3: Observability, Tracing & Auditing
 * Captures granular runtime metrics, tool calls, and validation scores.
 */

import { AgentTraceRecord } from "../core/types";

class TraceLogger {
  private inMemoryTraces: AgentTraceRecord[] = [];
  private readonly MAX_HISTORY = 100;

  /**
   * Records an execution trace
   */
  logTrace(record: AgentTraceRecord) {
    this.inMemoryTraces.unshift(record);
    if (this.inMemoryTraces.length > this.MAX_HISTORY) {
      this.inMemoryTraces.pop();
    }

    // Structured JSON log for production observability (Datadog / CloudWatch / stdout)
    const logPayload = {
      level: record.status === "SUCCESS" ? "info" : "warn",
      type: "HARNESS_AGENT_TRACE",
      traceId: record.id,
      userId: record.userId,
      institute: record.instituteCode,
      attempts: record.attempts,
      durationMs: record.totalDurationMs,
      tools: record.toolsCalled,
      violations: record.guardrailViolations,
      score: record.validationScore,
      status: record.status,
      timestamp: record.timestamp,
    };

    if (process.env.NODE_ENV !== "test") {
      console.log(`[HARNESS TRACE] ${JSON.stringify(logPayload)}`);
    }
  }

  /**
   * Retrieves recent traces for administrative dashboards
   */
  getRecentTraces(limit = 20): AgentTraceRecord[] {
    return this.inMemoryTraces.slice(0, limit);
  }
}

export const traceLogger = new TraceLogger();
