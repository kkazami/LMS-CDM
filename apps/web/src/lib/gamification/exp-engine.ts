/**
 * EXP Engine — Manages the EXP/Level progression system.
 *
 * Level tiers:
 *   Newcomer:  Level  1– 4  (0–399 EXP total)
 *   Bronze:    Level  5– 9  (400–1,199 EXP total)
 *   Silver:    Level 10–14  (1,200–2,399 EXP total)
 *   Gold:      Level 15–19  (2,400–3,999 EXP total)
 *   Platinum:  Level 20–24  (4,000–5,999 EXP total)
 *   Diamond:   Level 25–29  (6,000–8,399 EXP total)
 *   Master:    Level 30–39  (8,400–13,999 EXP total)
 *   Legend:    Level 40+    (14,000+ EXP total)
 *
 * EXP per level scales with a simple formula:
 *   expForLevel(n) = 100 * n    (Level 1→2 needs 100, Level 10→11 needs 1000, etc.)
 */

export type LevelTier =
  | "newcomer"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "legend";

export interface LevelInfo {
  level: number;
  tier: LevelTier;
  /** EXP needed to reach this level from level 1 */
  totalExpRequired: number;
  /** EXP needed to go from this level to the next */
  expToNextLevel: number;
  /** EXP progress within the current level (0 to expToNextLevel) */
  currentLevelProgress: number;
  /** Progress percentage within current level (0–100) */
  progressPercent: number;
}

export interface TierConfig {
  tier: LevelTier;
  label: string;
  minLevel: number;
  maxLevel: number;
  /** Tailwind color for the badge border and icon */
  color: string;
  /** Dark mode Tailwind color */
  darkColor: string;
  /** Hex color for SVG/canvas rendering */
  hex: string;
  /** Short emoji-style icon character to use beside name */
  icon: string;
}

export const TIER_CONFIG: Record<LevelTier, TierConfig> = {
  newcomer: { tier: "newcomer", label: "Newcomer", minLevel: 1, maxLevel: 4, color: "text-slate-500", darkColor: "dark:text-slate-400", hex: "#94a3b8", icon: "🌱" },
  bronze: { tier: "bronze", label: "Bronze", minLevel: 5, maxLevel: 9, color: "text-amber-700", darkColor: "dark:text-amber-500", hex: "#b45309", icon: "🥉" },
  silver: { tier: "silver", label: "Silver", minLevel: 10, maxLevel: 14, color: "text-slate-400", darkColor: "dark:text-slate-300", hex: "#94a3b8", icon: "🥈" },
  gold: { tier: "gold", label: "Gold", minLevel: 15, maxLevel: 19, color: "text-yellow-500", darkColor: "dark:text-yellow-400", hex: "#eab308", icon: "🥇" },
  platinum: { tier: "platinum", label: "Platinum", minLevel: 20, maxLevel: 24, color: "text-cyan-500", darkColor: "dark:text-cyan-400", hex: "#06b6d4", icon: "💠" },
  diamond: { tier: "diamond", label: "Diamond", minLevel: 25, maxLevel: 29, color: "text-blue-400", darkColor: "dark:text-blue-300", hex: "#60a5fa", icon: "💎" },
  master: { tier: "master", label: "Master", minLevel: 30, maxLevel: 39, color: "text-purple-500", darkColor: "dark:text-purple-400", hex: "#a855f7", icon: "⚡" },
  legend: { tier: "legend", label: "Legend", minLevel: 40, maxLevel: 999, color: "text-rose-500", darkColor: "dark:text-rose-400", hex: "#f43f5e", icon: "👑" },
};

/** EXP required to reach a given level from level 1 */
export function totalExpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (100 * (level - 1) * level) / 2;
}

/** EXP needed to advance from `level` to `level + 1` */
export function expToNextLevel(level: number): number {
  return 100 * level;
}

export function getTierForLevel(level: number): LevelTier {
  for (const [tierKey, config] of Object.entries(TIER_CONFIG)) {
    if (level >= config.minLevel && level <= config.maxLevel) {
      return tierKey as LevelTier;
    }
  }
  return "legend";
}

/** Compute full level info from total accumulated EXP */
export function computeLevelInfo(totalExp: number): LevelInfo {
  let level = 1;
  while (totalExp >= totalExpForLevel(level + 1)) {
    level++;
  }

  const currentLevelBaseExp = totalExpForLevel(level);
  const nextLevelBaseExp = totalExpForLevel(level + 1);
  const currentLevelProgress = totalExp - currentLevelBaseExp;
  const expNeeded = nextLevelBaseExp - currentLevelBaseExp;
  const progressPercent = Math.min(Math.round((currentLevelProgress / (expNeeded || 1)) * 100), 100);

  const tier = getTierForLevel(level);

  return {
    level,
    tier,
    totalExpRequired: currentLevelBaseExp,
    expToNextLevel: expNeeded,
    currentLevelProgress,
    progressPercent,
  };
}

/**
 * EXP values for different actions across all LMS modules.
 * Balanced economy with CodeLab and 100% assignments as top earners.
 */
export const EXP_VALUES = {
  login_daily: 10,              // Daily login
  login_streak_7: 50,           // 7-day login streak bonus
  login_streak_30: 200,         // 30-day login streak bonus
  assignment_submitted: 15,     // Submitting an assignment (first-time per assignment)
  assignment_perfect: 50,       // Assignment score = 100%
  attendance_present: 10,       // Marked present for class
  codelab_level_complete: 30,   // Completing a CodeLab level (score ≥ 60)
  codelab_level_perfect: 80,    // Completing a CodeLab level (score = 100)
  flashcard_session: 10,        // Reviewing a flashcard deck to completion
  material_read: 10,            // Completing a learning material / document (≥15s)
  discussion_post: 5,           // Constructive course discussion or reply (≥15 chars)
  study_focus_15m: 10,          // 15 minutes of verified focus study time
  badge_earned: 25,             // Any badge earned
  grade_incentive: 0,           // Set per GradeIncentiveRule.bonusExp
} as const;

/**
 * Daily EXP caps per category (resets at 12:00 AM PST / GMT+8).
 * Prevents botting, auto-clickers, and rapid repetitive farming.
 */
export const DAILY_EXP_CAPS = {
  flashcard: 50,        // Max 5 deck review sessions per day
  material: 50,         // Max 5 learning materials per day
  discussion: 25,       // Max 5 discussion messages per day
  study_session: 50,    // Max 50 EXP from focus sessions per day
} as const;

