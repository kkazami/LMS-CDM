export type HallOfFameCategory = "ENTREPRENEUR" | "HR_LEADER";

export type ProfileOrigin = "FILIPINO" | "INTERNATIONAL";

export type EntrepreneurSubject =
  | "Entrepreneurship"
  | "Managerial Accounting"
  | "Personal Finance"
  | "Income Taxation";

export type HrLeaderSubject =
  | "Human Resources Management"
  | "Recruitment and Selection"
  | "Organizational Development";

export type HallOfFameSubject = EntrepreneurSubject | HrLeaderSubject;

export interface HallOfFameSource {
  title: string;
  publisher: string;
  url: string;
  type: "OFFICIAL" | "GOVERNMENT_OR_PROFESSIONAL" | "ACADEMIC" | "NEWS_OR_PUBLICATION";
}

export interface HallOfFameAchievement {
  id: string;
  title: string;
  period: string;
  explanation: string;
  sourceLabel: string;
  sourceUrl: string;
}

export interface HallOfFameMilestone {
  year: string;
  title: string;
  description: string;
}

export interface HallOfFameChallenge {
  title: string;
  situation: string;
  decision: string;
  outcomeAndLesson: string;
}

export interface HallOfFameLesson {
  topic: string;
  documentedFact: string;
  educationalInterpretation: string;
}

export interface HallOfFameSubjectConnection {
  subject: HallOfFameSubject;
  connectionExplanation: string;
}

export interface HallOfFameQuizItem {
  question: string;
  options: readonly [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface HallOfFameProfile {
  id: string;
  category: HallOfFameCategory;
  origin: ProfileOrigin;
  fullName: string;
  countryLabel: string;
  professionRole: string;
  organization: string;
  currentOrFinalStatus: string;
  historicalPositions: string;
  portraitUrl: string | null;
  portraitInitials: string;
  portraitAccent: {
    primary: string;
    secondary: string;
    badgeBg: string;
  };
  featuredAchievementBadge: string;
  whyTheyMatterSummary: string;
  shortBiography: string;
  careerBackgroundAndTurningPoints: string;
  /** Mandatory 100–180 words explaining specifically why the person is famous and influential */
  whyFamous: string;
  majorAchievements: readonly HallOfFameAchievement[];
  careerMilestones: readonly HallOfFameMilestone[];
  challengesAndDecisions: readonly HallOfFameChallenge[];
  lessonsForStudents: readonly HallOfFameLesson[];
  relatedSubjects: readonly HallOfFameSubjectConnection[];
  reflectionQuestion: string;
  quiz: HallOfFameQuizItem;
  sources: readonly HallOfFameSource[];
  isFeaturedSpotlight?: boolean;
}

