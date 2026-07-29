/**
 * Calculates streaks with a timezone-aware 48-hour grace period rule.
 * - If last activity was today, streak remains same.
 * - If last activity was yesterday (or within 48h), streak increments.
 * - If last activity was > 48h ago, streak resets to 1.
 */
export function calculateStreak(
  currentStreak: number, 
  longestStreak: number, 
  lastActivityDate: Date | null, 
  now: Date = new Date()
) {
  if (!lastActivityDate) {
    return { currentStreak: 1, longestStreak: Math.max(1, longestStreak) };
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const diffHours = (now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  let newCurrentStreak = currentStreak;
  
  if (diffHours < 24) {
    // Still the same "day" roughly, or same session. Don't increment yet, just keep it.
    // If they already lost it, it stays 1.
    if (newCurrentStreak === 0) newCurrentStreak = 1;
  } else if (diffHours <= 48) {
    // Next day (within grace period), increment!
    newCurrentStreak += 1;
  } else {
    // Grace period expired, reset streak.
    newCurrentStreak = 1;
  }

  const newLongestStreak = Math.max(longestStreak, newCurrentStreak);

  return { currentStreak: newCurrentStreak, longestStreak: newLongestStreak };
}
