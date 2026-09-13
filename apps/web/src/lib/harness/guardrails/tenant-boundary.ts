/**
 * apps/web/src/lib/harness/guardrails/tenant-boundary.ts
 *
 * Layer 2 Guardrail: Multi-Tenant Boundary Firewall
 * Enforces absolute tenant isolation between ICS, IBE, and ITE institutes.
 */

import { AgentContext, GuardrailCheckResult } from "../core/types";

const VALID_INSTITUTE_CODES = new Set(["ics", "ibe", "ite"]);

export function validateTenantBoundary(
  context: AgentContext,
  targetInstituteCode?: string
): GuardrailCheckResult {
  // 1. Check if the context institute is valid
  if (!VALID_INSTITUTE_CODES.has(context.instituteCode)) {
    return {
      allowed: false,
      guardrailName: "TenantBoundaryFirewall",
      reason: `Invalid institute code '${context.instituteCode}'. Allowed: ics, ibe, ite.`,
      severity: "BLOCK",
    };
  }

  // 2. Check if a target institute was specified and differs from session
  if (targetInstituteCode && targetInstituteCode.toLowerCase() !== context.instituteCode.toLowerCase()) {
    return {
      allowed: false,
      guardrailName: "TenantBoundaryFirewall",
      reason: `Cross-Tenant Access Violation: User from '${context.instituteCode}' attempted to access resources in '${targetInstituteCode}'.`,
      severity: "BLOCK",
    };
  }

  return {
    allowed: true,
    guardrailName: "TenantBoundaryFirewall",
  };
}
