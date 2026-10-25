export type ArenaQuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE";
export type ArenaScoringMethod = "SPEED_BASED" | "ACCURACY_BASED";
export type ArenaSessionStatus = "LOBBY" | "QUESTION_ACTIVE" | "QUESTION_RESULT" | "LEADERBOARD" | "FINISHED";
export type ArenaQuizStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ArenaChoiceConfig {
  id?: string;
  choiceText: string;
  isCorrect: boolean;
  colorIndex: number;
  orderIndex: number;
}

export interface ArenaQuestionConfig {
  id?: string;
  questionText: string;
  questionType: ArenaQuestionType;
  mediaUrl?: string | null;
  timeLimitSeconds: number;
  basePoints: number;
  speedBonusEnabled: boolean;
  explanation?: string | null;
  orderIndex: number;
  choices: ArenaChoiceConfig[];
}

export interface ArenaQuizDetail {
  id: string;
  title: string;
  description?: string | null;
  coverImage?: string | null;
  courseId?: string | null;
  instituteId: string;
  authorId: string;
  status: ArenaQuizStatus;
  defaultTimeLimitSeconds: number;
  scoringMethod: ArenaScoringMethod;
  enableIntegrityMonitoring: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  showLeaderboardAfterEach: boolean;
  showAnswerFeedback: string;
  allowReconnection: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
    code: string;
  } | null;
  author?: {
    id: string;
    name: string;
    email: string;
  } | null;
  questions: ArenaQuestionConfig[];
  _count?: {
    questions: number;
    sessions: number;
  };
}

export interface ArenaSessionPublicState {
  sessionId: string;
  pin: string;
  quizTitle: string;
  status: ArenaSessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  scoringMethod: ArenaScoringMethod;
  enableIntegrityMonitoring: boolean;
  startedAt?: string | null;
  currentQuestionStartedAt?: string | null;
  currentQuestionDeadline?: string | null;
  currentQuestion?: {
    id: string;
    questionText: string;
    questionType: ArenaQuestionType;
    mediaUrl?: string | null;
    timeLimitSeconds: number;
    basePoints: number;
    orderIndex: number;
    choices: Array<{
      id: string;
      choiceText: string;
      colorIndex: number;
      orderIndex: number;
      // Note: isCorrect is omitted during QUESTION_ACTIVE!
      isCorrect?: boolean;
    }>;
    explanation?: string | null;
  } | null;
  participantsCount: number;
  answeredCount: number;
  leaderboard?: Array<{
    id: string;
    studentId: string;
    nickname: string;
    avatar?: string | null;
    score: number;
    rank: number;
    currentStreak: number;
  }>;
  distribution?: Record<string, number>; // choiceId -> count
}

export const ARENA_PALETTE = [
  {
    index: 0,
    name: "Option A",
    shape: "option-a",
    bg: "bg-[#141A29] border-2 border-indigo-500/40 text-indigo-100",
    hover: "hover:bg-[#1B2338] hover:border-indigo-400",
    active: "active:bg-[#222C47]",
    border: "border-indigo-500/40",
    text: "text-white",
    fill: "#6366F1",
    symbol: "A",
    barColor: "bg-indigo-500",
  },
  {
    index: 1,
    name: "Option B",
    shape: "option-b",
    bg: "bg-[#112322] border-2 border-teal-500/40 text-teal-100",
    hover: "hover:bg-[#172E2D] hover:border-teal-400",
    active: "active:bg-[#1E3B3A]",
    border: "border-teal-500/40",
    text: "text-white",
    fill: "#14B8A6",
    symbol: "B",
    barColor: "bg-teal-500",
  },
  {
    index: 2,
    name: "Option C",
    shape: "option-c",
    bg: "bg-[#261E16] border-2 border-amber-500/40 text-amber-100",
    hover: "hover:bg-[#33281E] hover:border-amber-400",
    active: "active:bg-[#403326]",
    border: "border-amber-500/40",
    text: "text-white",
    fill: "#F59E0B",
    symbol: "C",
    barColor: "bg-amber-500",
  },
  {
    index: 3,
    name: "Option D",
    shape: "option-d",
    bg: "bg-[#22162B] border-2 border-purple-500/40 text-purple-100",
    hover: "hover:bg-[#2C1D38] hover:border-purple-400",
    active: "active:bg-[#382547]",
    border: "border-purple-500/40",
    text: "text-white",
    fill: "#A855F7",
    symbol: "D",
    barColor: "bg-purple-500",
  },
] as const;
