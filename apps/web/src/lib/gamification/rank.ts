/**
 * Leaderboard rank, matching the leaderboard page order: EXP descending, then studentId
 * ascending as a deterministic tie-break (so tied students never share or swap ranks).
 * Pure: the db-backed counting lives in lib/dashboard-data.ts.
 */

/** Rank from counts of students ahead of you. Students with no EXP are unranked (null). */
export function rankFromCounts(exp: number, higherExpCount: number, tiedLowerIdCount: number): number | null {
  if (!Number.isFinite(exp) || exp <= 0) return null;
  return higherExpCount + tiedLowerIdCount + 1;
}

export interface RankEntry {
  id: string;
  exp: number;
}

/** Rank of `self` among `others` (same institute students). */
export function computeRank(self: RankEntry, others: RankEntry[]): number | null {
  let higher = 0;
  let tiedLower = 0;
  for (const other of others) {
    if (other.id === self.id) continue;
    if (other.exp > self.exp) higher++;
    else if (other.exp === self.exp && other.id < self.id) tiedLower++;
  }
  return rankFromCounts(self.exp, higher, tiedLower);
}
