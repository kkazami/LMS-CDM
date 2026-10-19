export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "CHECKBOXES"
  | "SHORT_ANSWER"
  | "PARAGRAPH"
  | "DROPDOWN"
  | "LINEAR_SCALE"
  | "STAR_RATING"
  | "DATE"
  | "FILE_UPLOAD"
  | "MATRIX"
  | "RANKING"
  | "IMAGE_CHOICE"
  | "CODE_ANSWER"
  | "SECTION_HEADER";

export type FormType = "QUIZ" | "MIDTERM_EXAM" | "FINAL_EXAM" | "ACTIVITY";
export type FormStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
export type ScoreToKeep = "HIGHEST" | "LATEST" | "AVERAGE";
export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "TIMED_OUT" | "ABANDONED";

export interface FormOption {
  id: string;
  text: string;
  imageUrl?: string;
  isCorrect?: boolean;
  feedback?: string;
}

export interface LinearScaleConfig {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface StarRatingConfig {
  maxStars: number;
}

export interface MatrixConfig {
  rows: string[];
  columns: string[];
}

export interface RankingConfig {
  items: Array<{ id: string; text: string }>;
}

export interface CodeAnswerConfig {
  language: string;
  starterCode?: string;
  correctOutput?: string;
}

export interface FileUploadConfig {
  allowedTypes?: string[]; // e.g. ["pdf", "docx", "png", "zip"]
  maxMb?: number;
}

export interface ShortAnswerConfig {
  correctAnswers?: string[];
  caseSensitive?: boolean;
  regexPattern?: string;
}

export interface QuestionConfig {
  options?: FormOption[];
  linearScale?: LinearScaleConfig;
  starRating?: StarRatingConfig;
  matrix?: MatrixConfig;
  ranking?: RankingConfig;
  codeAnswer?: CodeAnswerConfig;
  fileUpload?: FileUploadConfig;
  shortAnswer?: ShortAnswerConfig;
  [key: string]: unknown;
}

export interface FormSectionData {
  id: string;
  formId: string;
  title: string | null;
  description: string | null;
  position: number;
  pageNumber: number;
  questions?: FormQuestionData[];
}

export interface FormQuestionData {
  id: string;
  formId: string;
  sectionId?: string | null;
  bankItemId?: string | null;
  questionType: QuestionType;
  prompt: string;
  description?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  position: number;
  isRequired: boolean;
  points: number;
  partialCredit: boolean;
  config: QuestionConfig;
  showIfQuestionId?: string | null;
  showIfAnswer?: string | null;
  minLength?: number | null;
  maxLength?: number | null;
  createdAt?: string | Date;
}

export interface FormData {
  id: string;
  courseId: string;
  syllabusItemId: string;
  createdBy: string;
  title: string;
  description: string;
  formType: FormType;
  status: FormStatus;
  opensAt?: string | Date | null;
  closesAt?: string | Date | null;
  timeLimitMins?: number | null;
  maxAttempts: number;
  scoreToKeep: ScoreToKeep;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showScoreAfter: boolean;
  showAnswersAfter: boolean;
  showFeedbackAfter: boolean;
  isProctored: boolean;
  hasPassword?: boolean;
  disableCopyPaste: boolean;
  detectTabSwitch: boolean;
  lockBrowser: boolean;
  totalPoints?: number | null;
  passingScore?: number | null;
  confirmationMessage?: string | null;
  themeColor?: string | null;
  headerImageUrl?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  sections?: FormSectionData[];
  questions?: FormQuestionData[];
  _count?: {
    attempts?: number;
    questions?: number;
  };
}

export interface FormAttemptData {
  id: string;
  formId: string;
  userId: string;
  attemptNumber: number;
  status: AttemptStatus;
  startedAt: string | Date;
  submittedAt?: string | Date | null;
  timeSpentSecs?: number | null;
  deadlineAt?: string | Date | null;
  rawScore?: number | null;
  totalPoints?: number | null;
  percentage?: number | null;
  passed?: boolean | null;
  syncedToGradebook: boolean;
  tabSwitchCount: number;
  copyPasteCount: number;
  user?: {
    id: string;
    name: string;
    email: string;
    studentNumber?: string | null;
  };
  answers?: FormAttemptAnswerData[];
}

export interface FormAttemptAnswerData {
  id: string;
  attemptId: string;
  questionId: string;
  answerText?: string | null;
  answerOptions?: string[] | null; // Parsed array of option IDs
  answerNumber?: number | null;
  answerDate?: string | Date | null;
  answerRanking?: string[] | null; // Parsed array of item IDs
  answerMatrix?: Record<string, string> | null; // Parsed row -> col map
  fileUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
  isCorrect?: boolean | null;
  pointsAwarded?: number | null;
  autoGraded: boolean;
  instructorGraded: boolean;
  feedback?: string | null;
  answeredAt: string | Date;
  question?: FormQuestionData;
}

export interface QuestionBankItemData {
  id: string;
  courseId?: string | null;
  createdBy: string;
  questionType: QuestionType;
  prompt: string;
  config: QuestionConfig;
  points: number;
  tags: string[];
  timesUsed: number;
  createdAt: string | Date;
}

export interface GradeResult {
  earned: number;
  isCorrect: boolean | null;
  feedback: string | null;
}

export interface AttemptGradingSummary {
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean | null;
}

export interface QuestionAnalyticsItem {
  id: string;
  position: number;
  prompt: string;
  questionType: QuestionType;
  points: number;
  answeredCount: number;
  correctCount: number;
  averageScore: number;
  difficultyPercent: number; // percentage incorrect/struggled
  optionsBreakdown?: Array<{
    optionId: string;
    text: string;
    count: number;
    isCorrect: boolean;
  }>;
}

export interface FormAnalyticsData {
  formId: string;
  title: string;
  totalAttempts: number;
  uniqueStudents: number;
  averageScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  passingRate: number;
  scoreDistribution: Array<{ range: string; count: number }>;
  questions: QuestionAnalyticsItem[];
}
