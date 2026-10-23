/**
 * Badge Catalog & Criteria Reference for Mobile LMS
 * Maps catalog rule definitions, criteria, categories, and icons to student badges.
 */

export interface BadgeCriteriaInfo {
  id: string;
  name: string;
  description: string;
  howToEarn: string;
  category: 'LEARNING' | 'STREAK' | 'EXCELLENCE' | 'LEVEL' | 'SPECIAL';
  iconName: string;
  levelRequirement?: number;
}

export const BADGE_CRITERIA_MAP: Record<string, BadgeCriteriaInfo> = {
  // Learning Milestones
  'first-submission': {
    id: 'first-submission',
    name: 'First Step',
    description: 'Submitted your first assignment.',
    howToEarn: 'Submit any assignment in any course.',
    category: 'LEARNING',
    iconName: 'Send',
  },
  'codelab-first': {
    id: 'codelab-first',
    name: 'Code Curious',
    description: 'Completed your first CodeLab level.',
    howToEarn: 'Pass any CodeLab level (score >= 60%) in any language.',
    category: 'LEARNING',
    iconName: 'Terminal',
  },
  'codelab-track-complete': {
    id: 'codelab-track-complete',
    name: 'Track Champion',
    description: 'Completed all 30 levels in any CodeLab language track.',
    howToEarn: 'Pass all 30 levels in Python, C++, Java, JavaScript, C#, SQL, HTML, or CSS.',
    category: 'LEARNING',
    iconName: 'Trophy',
  },
  'codelab-polyglot': {
    id: 'codelab-polyglot',
    name: 'Polyglot',
    description: 'Completed at least one level in all 8 CodeLab language tracks.',
    howToEarn: 'Pass Level 1 in Python, C++, Java, JavaScript, C#, SQL, HTML, and CSS.',
    category: 'LEARNING',
    iconName: 'Globe',
  },
  'codelab-master': {
    id: 'codelab-master',
    name: 'Code Master',
    description: 'Completed all 30 levels in at least 3 CodeLab language tracks.',
    howToEarn: 'Fully complete 3 or more language tracks in CodeLab.',
    category: 'LEARNING',
    iconName: 'Code2',
    levelRequirement: 10,
  },
  'assignments-10': {
    id: 'assignments-10',
    name: 'Dedicated Learner',
    description: 'Submitted 10 assignments.',
    howToEarn: 'Submit 10 assignments across any courses.',
    category: 'LEARNING',
    iconName: 'BookCheck',
  },
  'assignments-50': {
    id: 'assignments-50',
    name: 'Relentless',
    description: 'Submitted 50 assignments.',
    howToEarn: 'Submit 50 assignments across any courses.',
    category: 'LEARNING',
    iconName: 'Layers',
    levelRequirement: 5,
  },
  'first-course-enrolled': {
    id: 'first-course-enrolled',
    name: 'Enrolled',
    description: 'Joined your first course.',
    howToEarn: 'Get approved into any course.',
    category: 'LEARNING',
    iconName: 'GraduationCap',
  },
  'assignment-first': {
    id: 'assignment-first',
    name: 'First Turn-In',
    description: 'Submitted your very first assignment.',
    howToEarn: 'Submit any coursework assignment.',
    category: 'LEARNING',
    iconName: 'BookCheck',
  },
  'material-first': {
    id: 'material-first',
    name: 'Curious Mind',
    description: 'Read your first learning material or syllabus document.',
    howToEarn: 'Read and review any course syllabus material.',
    category: 'LEARNING',
    iconName: 'BookOpen',
  },
  'study-session-first': {
    id: 'study-session-first',
    name: 'Deep Focus',
    description: 'Completed your first 15-minute study focus session.',
    howToEarn: 'Complete a study focus session of 15 minutes or longer.',
    category: 'LEARNING',
    iconName: 'Timer',
  },
  'discussion-first': {
    id: 'discussion-first',
    name: 'Active Voice',
    description: 'Participated in a course communication or discussion.',
    howToEarn: 'Send a message in course class stream communications.',
    category: 'SPECIAL',
    iconName: 'MessageCircle',
  },
  'flashcard-first': {
    id: 'flashcard-first',
    name: 'Flash of Insight',
    description: 'Reviewed a flashcard deck for the first time.',
    howToEarn: 'Review any study flashcard deck to completion.',
    category: 'LEARNING',
    iconName: 'Zap',
  },
  'perfect-attendance-week': {
    id: 'perfect-attendance-week',
    name: 'Never Miss a Day',
    description: 'Marked present every day in a week.',
    howToEarn: 'Be marked as Present for 5 consecutive class sessions.',
    category: 'LEARNING',
    iconName: 'CalendarCheck',
  },

  // Streaks & Consistency
  'login-streak-3': {
    id: 'login-streak-3',
    name: 'Warming Up',
    description: 'Logged in 3 days in a row.',
    howToEarn: 'Log in on 3 consecutive days.',
    category: 'STREAK',
    iconName: 'Flame',
  },
  'login-streak-7': {
    id: 'login-streak-7',
    name: 'Week Warrior',
    description: 'Logged in 7 days in a row.',
    howToEarn: 'Log in for 7 consecutive days without missing a day.',
    category: 'STREAK',
    iconName: 'Flame',
  },
  'login-streak-14': {
    id: 'login-streak-14',
    name: 'Fortnight Flame',
    description: 'Logged in 14 days in a row.',
    howToEarn: 'Log in for 14 consecutive days.',
    category: 'STREAK',
    iconName: 'Flame',
  },
  'login-streak-30': {
    id: 'login-streak-30',
    name: 'Monthly Maven',
    description: 'Logged in 30 days in a row.',
    howToEarn: 'Log in for 30 consecutive days.',
    category: 'STREAK',
    iconName: 'Flame',
  },
  'login-days-100': {
    id: 'login-days-100',
    name: 'Century Club',
    description: 'Logged in 100 unique days total.',
    howToEarn: 'Log in on any 100 different days.',
    category: 'STREAK',
    iconName: 'CalendarDays',
  },
  'early-bird': {
    id: 'early-bird',
    name: 'Early Bird',
    description: 'Logged in before 7 AM on 5 different days.',
    howToEarn: 'Log in before 7:00 AM on any 5 days.',
    category: 'STREAK',
    iconName: 'Sunrise',
  },
  'night-owl': {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Submitted an assignment after 10 PM on 3 different days.',
    howToEarn: 'Submit any assignment after 10:00 PM on 3 separate days.',
    category: 'STREAK',
    iconName: 'Moon',
  },

  // Excellence
  'perfect-score': {
    id: 'perfect-score',
    name: 'Perfectionist',
    description: 'Scored 100% on any graded item.',
    howToEarn: 'Earn a 100% score on any assignment, quiz, or activity.',
    category: 'EXCELLENCE',
    iconName: 'Star',
  },
  'perfect-scores-5': {
    id: 'perfect-scores-5',
    name: 'Gold Standard',
    description: 'Scored 100% on 5 different graded items.',
    howToEarn: 'Earn 5 perfect scores across any assignments or activities.',
    category: 'EXCELLENCE',
    iconName: 'Award',
    levelRequirement: 3,
  },
  'codelab-perfect-level': {
    id: 'codelab-perfect-level',
    name: 'Spotless',
    description: 'Scored 100% on a CodeLab level on the first attempt.',
    howToEarn: 'Complete any CodeLab level with a perfect score on your first submission.',
    category: 'EXCELLENCE',
    iconName: 'CheckCircle2',
  },
  'grade-honor-roll': {
    id: 'grade-honor-roll',
    name: 'Honor Roll',
    description: 'Maintained an average grade >= 90 across all your courses.',
    howToEarn: 'Keep your overall grade average at or above 90 in all enrolled courses.',
    category: 'EXCELLENCE',
    iconName: 'GraduationCap',
    levelRequirement: 5,
  },

  // Level Milestones
  'level-5-bronze': {
    id: 'level-5-bronze',
    name: 'Bronze Initiate',
    description: 'Reached Level 5 — Bronze Tier.',
    howToEarn: 'Accumulate enough EXP to reach Level 5.',
    category: 'LEVEL',
    iconName: 'Shield',
    levelRequirement: 5,
  },
  'level-10-silver': {
    id: 'level-10-silver',
    name: 'Silver Ascent',
    description: 'Reached Level 10 — Silver Tier.',
    howToEarn: 'Accumulate enough EXP to reach Level 10.',
    category: 'LEVEL',
    iconName: 'Shield',
    levelRequirement: 10,
  },
  'level-15-gold': {
    id: 'level-15-gold',
    name: 'Gold Seeker',
    description: 'Reached Level 15 — Gold Tier.',
    howToEarn: 'Accumulate enough EXP to reach Level 15.',
    category: 'LEVEL',
    iconName: 'Shield',
    levelRequirement: 15,
  },
  'level-20-platinum': {
    id: 'level-20-platinum',
    name: 'Platinum Pioneer',
    description: 'Reached Level 20 — Platinum Tier.',
    howToEarn: 'Accumulate enough EXP to reach Level 20.',
    category: 'LEVEL',
    iconName: 'Diamond',
    levelRequirement: 20,
  },
  'level-25-diamond': {
    id: 'level-25-diamond',
    name: 'Diamond Devotee',
    description: 'Reached Level 25 — Diamond Tier.',
    howToEarn: 'Accumulate enough EXP to reach Level 25.',
    category: 'LEVEL',
    iconName: 'Gem',
    levelRequirement: 25,
  },
  'level-30-master': {
    id: 'level-30-master',
    name: 'Master Mind',
    description: 'Reached Level 30 — Master Tier.',
    howToEarn: 'Accumulate enough EXP to reach Level 30.',
    category: 'LEVEL',
    iconName: 'Zap',
    levelRequirement: 30,
  },
  'level-40-legend': {
    id: 'level-40-legend',
    name: 'Legend',
    description: 'Reached Level 40 — Legend Tier. The highest honor.',
    howToEarn: 'Accumulate enough EXP to reach Level 40.',
    category: 'LEVEL',
    iconName: 'Crown',
    levelRequirement: 40,
  },

  // Special / Rare
  'first-day': {
    id: 'first-day',
    name: 'Welcome!',
    description: 'Logged in for the very first time.',
    howToEarn: 'Access the LMS platform and initiate your student profile.',
    category: 'SPECIAL',
    iconName: 'PartyPopper',
  },
  'profile-complete': {
    id: 'profile-complete',
    name: 'Looking Sharp',
    description: 'Filled in all profile fields.',
    howToEarn: 'Complete your profile bio, department, and contact details.',
    category: 'SPECIAL',
    iconName: 'UserCheck',
  },
  'avatar-uploaded': {
    id: 'avatar-uploaded',
    name: 'Face of the Future',
    description: 'Uploaded a custom profile picture.',
    howToEarn: 'Upload a personal profile picture in Settings.',
    category: 'SPECIAL',
    iconName: 'Camera',
  },
  'deep-work-1h': {
    id: 'deep-work-1h',
    name: 'Deep Work Scholar',
    description: 'Completed a 1-hour active study session.',
    howToEarn: 'Spend 60 continuous minutes actively learning in the LMS.',
    category: 'SPECIAL',
    iconName: 'Zap',
  },

  // Legacy Activity Badge Aliases
  'first_successful_boot': {
    id: 'first_successful_boot',
    name: 'First Boot',
    description: 'Successfully pass an interactive activity for the first time.',
    howToEarn: 'Pass your first interactive activity.',
    category: 'LEARNING',
    iconName: 'Zap',
  },
  'perfect_score': {
    id: 'perfect_score',
    name: 'Perfectionist',
    description: 'Achieve a 100% score on any activity or assignment.',
    howToEarn: 'Earn a perfect 100% score on any activity.',
    category: 'EXCELLENCE',
    iconName: 'Trophy',
  },
  'five_day_streak': {
    id: 'five_day_streak',
    name: 'Consistent Learner',
    description: 'Achieve a 5-day activity streak.',
    howToEarn: 'Complete activities on 5 consecutive days.',
    category: 'STREAK',
    iconName: 'Flame',
  },
  'python_novice': {
    id: 'python_novice',
    name: 'Python Novice',
    description: 'Complete a CodeLab activity in Python.',
    howToEarn: 'Solve any CodeLab problem using Python.',
    category: 'LEARNING',
    iconName: 'Terminal',
  },
  'codelab_first_solve': {
    id: 'codelab_first_solve',
    name: 'First CodeLab Solve',
    description: 'Solve your first CodeLab algorithmic problem with 100% score.',
    howToEarn: 'Solve a CodeLab problem with 100% score.',
    category: 'LEARNING',
    iconName: 'Code2',
  },
  'codelab_hard_solver': {
    id: 'codelab_hard_solver',
    name: 'Hard Problem Master',
    description: 'Successfully solve a hard tier CodeLab problem.',
    howToEarn: 'Solve any Level 21+ problem in CodeLab.',
    category: 'EXCELLENCE',
    iconName: 'Flame',
  },
  'codelab_champion': {
    id: 'codelab_champion',
    name: 'CodeLab Champion',
    description: 'Solve all problems in the CodeLab problem bank.',
    howToEarn: 'Pass every problem in CodeLab.',
    category: 'EXCELLENCE',
    iconName: 'Crown',
  },
  'codelab_streak': {
    id: 'codelab_streak',
    name: 'CodeLab 5-Day Streak',
    description: 'Maintain a 5-day active problem solving streak in CodeLab.',
    howToEarn: 'Solve CodeLab problems on 5 consecutive days.',
    category: 'STREAK',
    iconName: 'Zap',
  },
};

/**
 * Returns criteria (howToEarn instruction) for a badge by its rule ID.
 */
export function getBadgeCriteria(ruleId: string, fallbackDesc?: string): string {
  if (!ruleId) return fallbackDesc || 'Complete required coursework activities.';
  const direct = BADGE_CRITERIA_MAP[ruleId];
  if (direct) return direct.howToEarn;

  const kebab = ruleId.replace(/_/g, '-');
  if (BADGE_CRITERIA_MAP[kebab]) return BADGE_CRITERIA_MAP[kebab].howToEarn;

  const snake = ruleId.replace(/-/g, '_');
  if (BADGE_CRITERIA_MAP[snake]) return BADGE_CRITERIA_MAP[snake].howToEarn;

  return fallbackDesc || 'Complete the associated learning requirement.';
}
