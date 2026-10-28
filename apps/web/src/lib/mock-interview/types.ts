export type InterviewCategoryKey =
  | "GENERAL"
  | "TEAMWORK_LEADERSHIP"
  | "PROBLEM_SOLVING"
  | "HR_RECRUITMENT"
  | "FAIR_ETHICS"
  | "BUSINESS_CUSTOMER";

export interface CategoryMeta {
  key: InterviewCategoryKey;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
  accentColor: string;
}

export const INTERVIEW_CATEGORIES: CategoryMeta[] = [
  {
    key: "GENERAL",
    label: "General Job Interview",
    shortLabel: "General Interview",
    description: "Core behavioral, background, career motivation, and value proposition questions.",
    iconName: "Briefcase",
    accentColor: "#F59E0B",
  },
  {
    key: "TEAMWORK_LEADERSHIP",
    label: "Teamwork and Leadership",
    shortLabel: "Team & Leadership",
    description: "Collaboration, handling conflict, cross-functional projects, and taking initiative.",
    iconName: "Users",
    accentColor: "#3B82F6",
  },
  {
    key: "PROBLEM_SOLVING",
    label: "Problem-Solving and Professionalism",
    shortLabel: "Problem Solving",
    description: "Analytical reasoning, working under pressure, ethics, and deadline prioritization.",
    iconName: "BrainCircuit",
    accentColor: "#10B981",
  },
  {
    key: "HR_RECRUITMENT",
    label: "HR Assistant and Recruitment",
    shortLabel: "HR & Recruitment",
    description: "Sourcing, candidate screening, scheduling, onboarding, and HR data handling.",
    iconName: "UserCheck",
    accentColor: "#8B5CF6",
  },
  {
    key: "FAIR_ETHICS",
    label: "Fair Recruitment and Workplace Ethics",
    shortLabel: "Fair Ethics",
    description: "Equal opportunity, bias elimination, confidentiality, privacy, and integrity standards.",
    iconName: "ShieldCheck",
    accentColor: "#EC4899",
  },
  {
    key: "BUSINESS_CUSTOMER",
    label: "Business, Customer Service, and Fresh Graduates",
    shortLabel: "Business & Customer",
    description: "Client satisfaction, handling difficult stakeholders, and bridging university experience to business roles.",
    iconName: "Handshake",
    accentColor: "#EAB308",
  },
];

export type AnswerClassification =
  | "STRONG"
  | "ACCEPTABLE"
  | "WEAK_INCOMPLETE"
  | "IRRELEVANT_INAPPROPRIATE";

export interface InterviewQuestionItem {
  id: string;
  category: InterviewCategoryKey;
  difficulty: "ENTRY" | "INTERMEDIATE" | "ADVANCED";
  questionText: string;
  jobPosition: string;
  situation: string;
  modelAnswer: string;
  interviewTip: string;
  evaluationCriteria: string[];
  competency: string;
}

export interface RecruiterScenarioQuestionOption {
  id: string;
  text: string;
  isBest: boolean;
  explanation: string;
}

export interface PreparedApplicantAnswer {
  answerText: string;
  classification: AnswerClassification;
  explanation: string;
}

export interface RecruiterScenarioFollowUp {
  id: string;
  text: string;
  isBest: boolean;
  explanation: string;
}

export interface RecruiterScenarioItem {
  id: string;
  title: string;
  category: InterviewCategoryKey;
  roleOrPosition: string;
  context: string;
  questionOptions: RecruiterScenarioQuestionOption[];
  applicantAnswers: Record<string, PreparedApplicantAnswer>;
  followUpOptions: RecruiterScenarioFollowUp[];
  practicalAdvice: string;
  competency: string;
}

export interface QuizQuestionItem {
  id: string;
  questionText: string;
  choices: string[];
  correctAnswer?: number; // Omitted on client when quiz is active
  explanation?: string; // Omitted on client when quiz is active
  category: InterviewCategoryKey;
  difficulty: "ENTRY" | "INTERMEDIATE" | "ADVANCED";
  pointValue: number;
}

export interface ApplicantSelfAssessmentChecklist {
  answersQuestion: boolean;
  includesExample: boolean;
  demonstratesCompetency: boolean;
  professionalLanguage: boolean;
  specificDetailed: boolean;
}

export interface StudentProgressSummary {
  totalQuestionsPracticed: number;
  totalSessionsCompleted: number;
  quizzesCompleted: number;
  bestQuizScore: number;
  latestQuizScore: number | null;
  savedCount: number;
  categoryStats: Record<InterviewCategoryKey, { practiced: number; total: number }>;
  recentAttempts: Array<{
    id: string;
    type: "APPLICANT" | "RECRUITER" | "QUIZ";
    title: string;
    date: string;
    score?: number;
    maxScore?: number;
    details?: Record<string, unknown>;
  }>;
}
