/**
 * Server-authoritative scoring calculations for Quiz Arena.
 */

export interface CalculatePointsParams {
  isCorrect: boolean;
  scoringMethod: "SPEED_BASED" | "ACCURACY_BASED";
  basePoints?: number;
  speedBonusEnabled?: boolean;
  timeLimitSeconds: number;
  responseTimeMs: number;
  currentStreak?: number;
}

export interface ScoreCalculationResult {
  isCorrect: boolean;
  basePointsEarned: number;
  speedBonusEarned: number;
  streakBonusEarned: number;
  totalPoints: number;
  newStreak: number;
}

export function calculateQuestionScore({
  isCorrect,
  scoringMethod,
  basePoints = 1000,
  speedBonusEnabled = true,
  timeLimitSeconds,
  responseTimeMs,
  currentStreak = 0,
}: CalculatePointsParams): ScoreCalculationResult {
  if (!isCorrect) {
    return {
      isCorrect: false,
      basePointsEarned: 0,
      speedBonusEarned: 0,
      streakBonusEarned: 0,
      totalPoints: 0,
      newStreak: 0,
    };
  }

  const newStreak = currentStreak + 1;
  const basePointsEarned = basePoints;

  let speedBonusEarned = 0;
  if (scoringMethod === "SPEED_BASED" && speedBonusEnabled && timeLimitSeconds > 0) {
    const totalAllowedMs = timeLimitSeconds * 1000;
    const clampedResponseMs = Math.min(Math.max(0, responseTimeMs), totalAllowedMs);
    // Faster answer yields up to 500 bonus points
    const timeRemainingFraction = Math.max(0, (totalAllowedMs - clampedResponseMs) / totalAllowedMs);
    speedBonusEarned = Math.round(500 * timeRemainingFraction);
  }

  // Small reward for ongoing answer streaks (e.g., 2 in a row = +50, 3 = +100)
  let streakBonusEarned = 0;
  if (newStreak >= 2) {
    streakBonusEarned = Math.min(250, (newStreak - 1) * 50);
  }

  const totalPoints = basePointsEarned + speedBonusEarned + streakBonusEarned;

  return {
    isCorrect: true,
    basePointsEarned,
    speedBonusEarned,
    streakBonusEarned,
    totalPoints,
    newStreak,
  };
}

/**
 * Generates a unique 6-digit PIN for a live game room.
 */
export function generateArenaPin(): string {
  // Generate a random 6-digit number between 100000 and 999999
  const pin = Math.floor(100000 + Math.random() * 900000);
  return pin.toString();
}
