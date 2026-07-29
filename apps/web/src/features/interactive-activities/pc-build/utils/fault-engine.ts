/**
 * fault-engine.ts
 *
 * Implements deterministic randomization for troubleshooting activities.
 * Given a seed and a pool of eligible faults, it deterministically selects
 * faults to inject so grading is reproducible but varied between students.
 */

// A simple seeded PRNG (Mulberry32)
export function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convert a string seed into a 32-bit integer for Mulberry32
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit int
  }
  return hash;
}

export type PCFaultType =
  | "RAM_WRONG_SLOT"
  | "CPU_POWER_UNPLUGGED"
  | "GPU_NOT_SEATED"
  | "NO_THERMAL_PASTE"
  | "PSU_UNPLUGGED";

/**
 * Deterministically picks between 1 and maxFaults from the provided pool based on the seed.
 */
export function injectFaults(
  seed: string,
  faultPool: string[],
  maxFaults: number = 2
): PCFaultType[] {
  if (!faultPool || faultPool.length === 0) return [];
  
  const rng = mulberry32(hashString(seed));
  
  // Create a copy so we can shuffle
  const shuffled = [...faultPool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Determine how many faults to inject (1 to maxFaults)
  // E.g. if maxFaults is 2, could inject 1 or 2.
  const numFaults = Math.floor(rng() * maxFaults) + 1;
  const clampedNum = Math.min(numFaults, shuffled.length);

  return shuffled.slice(0, clampedNum) as PCFaultType[];
}
