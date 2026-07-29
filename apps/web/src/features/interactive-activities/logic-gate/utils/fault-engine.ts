/**
 * fault-engine.ts (Logic Gate)
 *
 * Implements deterministic randomization for logic gate troubleshooting assignments.
 */

export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; 
  }
  return hash;
}

export type LogicFaultType =
  | "SWAPPED_GATE_OR_TO_XOR"
  | "MISWIRED_INPUT"
  | "MISSING_NOT_GATE";

export function injectFaults(
  seed: string,
  faultPool: string[],
  maxFaults: number = 1
): LogicFaultType[] {
  if (!faultPool || faultPool.length === 0) return [];
  
  const rng = mulberry32(hashString(seed));
  const shuffled = [...faultPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const numFaults = Math.floor(rng() * maxFaults) + 1;
  const clampedNum = Math.min(numFaults, shuffled.length);

  return shuffled.slice(0, clampedNum) as LogicFaultType[];
}
