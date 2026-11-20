export type WordWiseTab =
  | "overview"
  | "dictionary"
  | "categories"
  | "word-of-the-day";

export type WordWiseCategorySlug =
  | "academic-vocabulary"
  | "formal-english"
  | "transition-linking"
  | "analytical-descriptive"
  | "critical-argumentation"
  | "academic-communication";

export type WordWiseDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export type WordWisePartOfSpeech =
  | "Noun"
  | "Verb"
  | "Adjective"
  | "Adverb"
  | "Phrase";

export type WordWiseExerciseType =
  | "MULTIPLE_CHOICE"
  | "WORD_MATCHING"
  | "FILL_IN_BLANKS"
  | "FORMAL_REPLACEMENT"
  | "SENTENCE_CONSTRUCTION";

export type WordWiseSavedStatus = "LEARNING" | "MASTERED";

export type WordWiseProgressStatus = "EXPLORED" | "LEARNING" | "MASTERED";

export interface VocabularyCategoryItem {
  id: string;
  slug: WordWiseCategorySlug;
  name: string;
  description: string;
  sortOrder: number;
  wordCount: number;
}

export interface VocabularyExampleItem {
  id: string;
  sentence: string;
  contextNote: string | null;
}

export interface VocabularyWordItem {
  id: string;
  word: string;
  slug: string;
  pronunciation: string;
  partOfSpeech: WordWisePartOfSpeech;
  simpleDefinition: string;
  formalDefinition: string;
  usageContext: string;
  informalEquivalent: string | null;
  formalUsageNote: string | null;
  difficulty: WordWiseDifficulty;
  categoryId: string;
  categorySlug: WordWiseCategorySlug;
  categoryName: string;
  synonyms: string[];
  antonyms: string[];
  examples: VocabularyExampleItem[];
}

export interface FormalInformalComparisonItem {
  id: string;
  informalExpression: string;
  formalAlternative: string;
  partOfSpeech: WordWisePartOfSpeech;
  pronunciation: string;
  categoryName: string;
  whenAppropriate: string;
  informalSentence: string;
  formalSentence: string;
  relatedWordSlug: string;
}

export interface WordMatchingPair {
  wordId: string;
  word: string;
  pronunciation: string;
  definition: string;
}

export interface PracticeQuestionItem {
  id: string;
  exerciseType: WordWiseExerciseType;
  difficulty: WordWiseDifficulty;
  wordId: string;
  targetWord: string;
  pronunciation: string;
  partOfSpeech: WordWisePartOfSpeech;
  categoryName: string;
  prompt: string;
  contextSentence: string;
  options: string[];
  matchingPairs?: WordMatchingPair[];
  jumbledTokens?: string[];
  informalPhraseToReplace?: string;
  correctAnswer: string;
  explanation: string;
}

export interface PracticeFeedbackItem {
  questionId: string;
  wordId: string;
  targetWord: string;
  prompt: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

export interface PracticeAttemptRecord {
  id: string;
  exerciseType: WordWiseExerciseType;
  difficulty: WordWiseDifficulty;
  categorySlug: string | null;
  totalQuestions: number;
  correctAnswers: number;
  accuracyPct: number;
  completedAt: string;
  feedbackItems: PracticeFeedbackItem[];
}

export interface SavedVocabularyRecord {
  id: string;
  wordId: string;
  status: WordWiseSavedStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentWordProgressRecord {
  wordId: string;
  status: WordWiseProgressStatus;
  exploredCount: number;
  practiceCount: number;
  correctCount: number;
  lastExploredAt: string;
  masteredAt: string | null;
}

export interface PersonalVocabularyListRecord {
  id: string;
  name: string;
  description: string;
  wordIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CategoryProgressSummary {
  slug: WordWiseCategorySlug;
  name: string;
  totalWords: number;
  exploredCount: number;
  masteredCount: number;
  savedCount: number;
}

export interface RecentWordExplorationItem {
  wordId: string;
  word: string;
  slug: string;
  pronunciation: string;
  partOfSpeech: WordWisePartOfSpeech;
  categoryName: string;
  status: WordWiseProgressStatus;
  lastExploredAt: string;
}

export interface WordWiseProgressSummary {
  wordsExplored: number;
  wordsSaved: number;
  wordsMastered: number;
  wordsLearning: number;
  practiceActivitiesCompleted: number;
  averagePracticeAccuracy: number;
  learningStreak: number;
  categoryProgress: CategoryProgressSummary[];
  recentExplorations: RecentWordExplorationItem[];
  recentPracticeAttempts: PracticeAttemptRecord[];
}

export interface WritingImprovementSuggestion {
  id: string;
  matchedText: string;
  startIndex: number;
  endIndex: number;
  informalPhrase: string;
  recommendedReplacement: string;
  alternatives: string[];
  explanation: string;
  usageContext: string;
}

export interface WritingImprovementResult {
  originalText: string;
  improvedText: string;
  suggestions: WritingImprovementSuggestion[];
  wordCount: number;
  sentenceCount: number;
  formalityScorePct: number;
  disclaimer: string;
}

export interface WordWiseInitialPayload {
  studentName: string;
  programCode: string;
  programName: string;
  todayDateKey: string;
  categories: VocabularyCategoryItem[];
  words: VocabularyWordItem[];
  wordOfTheDay: VocabularyWordItem;
  comparisons: FormalInformalComparisonItem[];
  savedWords: SavedVocabularyRecord[];
  wordProgress: StudentWordProgressRecord[];
  personalLists: PersonalVocabularyListRecord[];
  quizAttempts: PracticeAttemptRecord[];
  progressSummary: WordWiseProgressSummary;
}

