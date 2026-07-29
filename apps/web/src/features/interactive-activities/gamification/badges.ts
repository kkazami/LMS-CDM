import { db } from "@/lib/db";

export interface BadgeRule {
  id: string;
  name: string;
  description: string;
  icon: string; // e.g. "Zap", "Award", "Cpu" for Lucide icons
  evaluate: (submission: any, profile: any, history: any[]) => boolean;
}

export const BADGE_RULES: BadgeRule[] = [
  {
    id: "first_successful_boot",
    name: "First Boot",
    description: "Successfully pass an interactive activity for the first time.",
    icon: "Power",
    evaluate: (submission, profile, history) => {
      // If this is their first passed submission
      return submission.passed && history.filter(h => h.passed).length === 1;
    }
  },
  {
    id: "perfect_score",
    name: "Perfectionist",
    description: "Achieve a 100% score on any activity.",
    icon: "Award",
    evaluate: (submission) => {
      return submission.score === 100 && submission.passed;
    }
  },
  {
    id: "five_day_streak",
    name: "Consistent Learner",
    description: "Achieve a 5-day activity streak.",
    icon: "Zap",
    evaluate: (submission, profile) => {
      return profile.currentStreak >= 5;
    }
  },
  {
    id: "python_novice",
    name: "Python Novice",
    description: "Complete a CodeLab activity in Python.",
    icon: "Terminal",
    evaluate: (submission) => {
      if (submission.activityType !== "codelab") return false;
      const state = JSON.parse(submission.stateCheck || "{}");
      return state.language === "python" && submission.passed;
    }
  }
];

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
