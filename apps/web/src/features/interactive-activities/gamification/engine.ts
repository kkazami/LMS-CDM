import { db } from "@/lib/db";
import { calculateStreak } from "./streak";
import { BADGE_RULES } from "./badges";
import { refreshLeaderboardCache, refreshCodeLabLeaderboardCache } from "./leaderboard-cache";

export async function evaluateBadges(
  studentId: string, 
  profileId: string, 
  submission: any, 
  profile: any
) {
  // Get history
  const history = await db.activitySubmission.findMany({
    where: { studentId },
    orderBy: { submittedAt: 'asc' }
  });

  const earnedBadges = await db.studentBadge.findMany({
    where: { profileId }
  });
  const earnedSet = new Set(earnedBadges.map(b => b.badgeRuleId));

  for (const rule of BADGE_RULES) {
    if (!earnedSet.has(rule.id)) {
      const qualifies = rule.evaluate(submission, profile, history);
      if (qualifies) {
        await db.studentBadge.create({
          data: {
            profileId,
            badgeRuleId: rule.id
          }
        });
      }
    }
  }
}

export async function processGamificationEvent(
  submission: any, 
  courseId: string
) {
  // 1. Ensure Profile Exists
  let profile = await db.gamificationProfile.findUnique({
    where: { studentId: submission.studentId }
  });

  if (!profile) {
    profile = await db.gamificationProfile.create({
      data: {
        studentId: submission.studentId,
        isLeaderboardAnonymized: true // default opt-in to privacy
      }
    });
  }

  // 2. Update Streak & Points
  const { currentStreak, longestStreak } = calculateStreak(
    profile.currentStreak, 
    profile.longestStreak, 
    profile.lastActivityDate
  );

  // Points algorithm (simple MVP: add new score if they passed)
  const newTotalPoints = profile.totalPoints + (submission.passed ? Math.round(submission.score) : 0);

  const updatedProfile = await db.gamificationProfile.update({
    where: { id: profile.id },
    data: {
      currentStreak,
      longestStreak,
      lastActivityDate: new Date(),
      totalPoints: newTotalPoints
    }
  });

  // 3. Evaluate Badges
  await evaluateBadges(submission.studentId, updatedProfile.id, submission, updatedProfile);

  // 4. Refresh Leaderboard Caches asynchronously
  refreshLeaderboardCache(courseId).catch(err => console.error("Leaderboard cache failed", err));
  if (submission.activityType === "codelab") {
    refreshCodeLabLeaderboardCache(courseId).catch(err => console.error("CodeLab leaderboard cache failed", err));
  }
}
