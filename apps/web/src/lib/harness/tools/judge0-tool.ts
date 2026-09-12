/**
 * apps/web/src/lib/harness/tools/judge0-tool.ts
 *
 * Layer 1 Tool: Sandboxed Code Execution
 * Allows the AI harness to test student code or verify code snippets against Judge0
 * without running unsafe code on the server host.
 */

import { executeJudge0Submission } from "@/features/interactive-activities/codelab/utils/judge0-config";
import { AgentContext, ToolDefinition } from "../core/types";
import { toolRegistry } from "./registry";

export interface ExecuteCodeArgs {
  sourceCode: string;
  languageId: number;
  stdin?: string;
}

export const executeSandboxedCodeTool: ToolDefinition<ExecuteCodeArgs> = {
  name: "executeSandboxedCode",
  description: "Executes source code in a secure sandboxed Judge0 container and returns stdout, stderr, and compilation errors.",
  execute: async ({ sourceCode, languageId, stdin }, context: AgentContext) => {
    // Basic length guardrail
    if (sourceCode.length > 64 * 1024) {
      return {
        success: false,
        error: "Payload exceeds maximum allowed code size (64KB).",
        durationMs: 0,
      };
    }

    try {
      const result = await executeJudge0Submission(sourceCode, languageId, stdin || "");
      return {
        success: true,
        data: {
          status: result.status.description,
          statusCode: result.status.id,
          stdout: result.stdout,
          stderr: result.stderr,
          compileOutput: result.compile_output,
          executionTime: result.time,
        },
        durationMs: 0,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Sandbox execution failed",
        durationMs: 0,
      };
    }
  },
};

toolRegistry.register(executeSandboxedCodeTool);
