/**
 * apps/web/src/lib/harness/tools/registry.ts
 *
 * Layer 1: Tool Orchestration & Permission Filter
 * Manages available tools, enforces RBAC checks, and executes tools safely.
 */

import { AgentContext, ToolDefinition, ToolExecutionResult } from "../core/types";

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  /**
   * Register a new tool with the harness
   */
  register(tool: ToolDefinition) {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get all tools accessible to the given context role
   */
  getAvailableTools(context: AgentContext): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((tool) => {
      if (!tool.requiredRoles || tool.requiredRoles.length === 0) return true;
      return tool.requiredRoles.includes(context.role);
    });
  }

  /**
   * Execute a tool safely with timing and error trapping
   */
  async executeTool(
    name: string,
    args: any,
    context: AgentContext
  ): Promise<ToolExecutionResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool '${name}' is not registered in the harness.`,
        durationMs: 0,
      };
    }

    // Role check
    if (tool.requiredRoles && !tool.requiredRoles.includes(context.role)) {
      return {
        success: false,
        error: `Access Denied: Role '${context.role}' cannot invoke tool '${name}'.`,
        durationMs: 0,
      };
    }

    const start = Date.now();
    try {
      const result = await tool.execute(args, context);
      return {
        ...result,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || `Execution failure in tool '${name}'`,
        durationMs: Date.now() - start,
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
