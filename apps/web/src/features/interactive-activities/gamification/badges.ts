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
  },
  {
    id: "codelab_first_solve",
    name: "First CodeLab Solve",
    description: "Solve your first CodeLab algorithmic problem with 100% score.",
    icon: "Award",
    evaluate: (submission) => {
      return submission.activityType === "codelab" && (submission.score === 100 || submission.passed);
    }
  },
  {
    id: "codelab_hard_solver",
    name: "Hard Problem Master",
    description: "Successfully solve a hard tier CodeLab problem (Level 21+).",
    icon: "Flame",
    evaluate: (submission) => {
      if (submission.activityType !== "codelab" || (!submission.passed && submission.score < 100)) return false;
      try {
        const state = JSON.parse(submission.stateCheck || "{}");
        const level = typeof state.level === "number" ? state.level : 0;
        return level >= 21;
      } catch {
        return false;
      }
    }
  },
  {
    id: "codelab_champion",
    name: "CodeLab Champion",
    description: "Solve all 30 problems in the CodeLab problem bank.",
    icon: "Trophy",
    evaluate: (submission, profile, history) => {
      if (submission.activityType !== "codelab") return false;
      const passedProblems = new Set(
        history
          .filter((h) => h.activityType === "codelab" && (h.passed || h.score === 100))
          .map((h) => h.templateId)
      );
      if (submission.passed || submission.score === 100) {
        passedProblems.add(submission.templateId);
      }
      return passedProblems.size >= 30;
    }
  },
  {
    id: "codelab_streak",
    name: "CodeLab 5-Day Streak",
    description: "Maintain a 5-day active problem solving streak in CodeLab.",
    icon: "Zap",
    evaluate: (submission, profile) => {
      return submission.activityType === "codelab" && profile.currentStreak >= 5;
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
