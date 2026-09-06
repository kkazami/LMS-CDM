export interface GamificationProfile {
  id: string;
  studentId: string;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  exp: number;
  level: number;
  levelTier: string;
  lastLoginDate: string | null;
  loginStreakCurrent: number;
  loginStreakLongest: number;
  totalLoginDays: number;
  isLeaderboardAnonymized: boolean;
}

export interface StudentBadge {
  id: string;
  badgeRuleId: string;
  title: string;
  description: string;
  category: 'LEARNING' | 'STREAK' | 'EXCELLENCE' | 'LEVEL' | 'SPECIAL';
  icon: string;
  isUnlocked: boolean;
  earnedAt?: string | null;
  isNew?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalPoints: number;
  currentStreak: number;
  level?: number;
  levelTier?: string;
  avatarUrl?: string | null;
  isCurrentUser?: boolean;
}

export interface LoginRewardResult {
  streak: number;
  expEarned: number;
  isBonusDay: boolean;
  newBadges: StudentBadge[];
  totalExp: number;
  newLevel?: number;
}
