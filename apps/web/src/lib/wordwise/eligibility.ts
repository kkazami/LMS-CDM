import { canIbeProgramAccessFeature } from "../ibe-programs/features";

export interface WordWiseAccessCandidate {
  role?: string | null;
  status?: string | null;
  instituteCode?: string | null;
  programCode?: string | null;
}

/**
 * Pure authorization predicate for the IBE WordWise – Vocabulary & Academic Language Hub.
 * Zero DB dependencies (safe for Node unit tests, edge middleware, and server layouts).
 * Scoped strictly to active IBE students enrolled in BSBA HRM.
 */
export function isWordWiseEligible(
  candidate: WordWiseAccessCandidate | null | undefined
): boolean {
  if (!candidate) return false;
  if (candidate.status && candidate.status.trim().toUpperCase() !== "ACTIVE") {
    return false;
  }
  const role = (candidate.role ?? "").trim().toUpperCase();
  if (role !== "STUDENT") return false;
  if ((candidate.instituteCode ?? "").trim().toUpperCase() !== "IBE") {
    return false;
  }
  return canIbeProgramAccessFeature(candidate.programCode, "wordwise");
}
