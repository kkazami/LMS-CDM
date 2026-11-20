import type {
  CategoryProgressSummary,
  PracticeAttemptRecord,
  RecentWordExplorationItem,
  SavedVocabularyRecord,
  StudentWordProgressRecord,
  VocabularyCategoryItem,
  VocabularyWordItem,
  WordWiseProgressSummary,
} from "./types";

function toUtcDateKey(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addUtcDays(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return toUtcDateKey(dt);
}

/**
 * Computes consecutive daily learning streak from actual student activity timestamps
 * (word explorations, saved word updates, and completed practice attempts).
 */
export function computeLearningStreak(
  activityTimestamps: readonly string[],
  todayDateKey: string
): number {
  const activeDays = new Set<string>();
  for (const ts of activityTimestamps) {
    const key = toUtcDateKey(ts);
    if (key) activeDays.add(key);
  }

  if (activeDays.size === 0) return 0;

  const yesterdayKey = addUtcDays(todayDateKey, -1);
  let cursorKey: string | null = null;
  if (activeDays.has(todayDateKey)) {
    cursorKey = todayDateKey;
  } else if (activeDays.has(yesterdayKey)) {
    cursorKey = yesterdayKey;
  } else {
    return 0;
  }

  let streak = 0;
  while (cursorKey && activeDays.has(cursorKey)) {
    streak += 1;
    cursorKey = addUtcDays(cursorKey, -1);
  }
  return streak;
}

export interface BuildProgressSummaryInput {
  categories: readonly VocabularyCategoryItem[];
  words: readonly VocabularyWordItem[];
  savedWords: readonly SavedVocabularyRecord[];
  wordProgress: readonly StudentWordProgressRecord[];
  quizAttempts: readonly PracticeAttemptRecord[];
  todayDateKey: string;
}

/**
 * Computes all student progress metrics strictly from actual student records.
 * Never fabricates or hardcodes statistics.
 */
export function buildWordWiseProgressSummary(
  input: BuildProgressSummaryInput
): WordWiseProgressSummary {
  const {
    categories,
    words,
    savedWords,
    wordProgress,
    quizAttempts,
    todayDateKey,
  } = input;

  const wordById = new Map(words.map((w) => [w.id, w] as const));
  const savedByWordId = new Map(savedWords.map((s) => [s.wordId, s] as const));
  const progressByWordId = new Map(
    wordProgress.map((p) => [p.wordId, p] as const)
  );

  // Words explored includes any word with an exploration/progress record or saved record
  const exploredWordIds = new Set<string>();
  const masteredWordIds = new Set<string>();
  const learningWordIds = new Set<string>();

  for (const p of wordProgress) {
    exploredWordIds.add(p.wordId);
    if (p.status === "MASTERED") {
      masteredWordIds.add(p.wordId);
    } else if (p.status === "LEARNING") {
      learningWordIds.add(p.wordId);
    }
  }

  for (const s of savedWords) {
    exploredWordIds.add(s.wordId);
    if (s.status === "MASTERED") {
      masteredWordIds.add(s.wordId);
      learningWordIds.delete(s.wordId);
    } else {
      if (!masteredWordIds.has(s.wordId)) {
        learningWordIds.add(s.wordId);
      }
    }
  }

  // Words that were explored but not yet mastered are also part of active learning if not already counted
  for (const wordId of exploredWordIds) {
    if (!masteredWordIds.has(wordId)) {
      learningWordIds.add(wordId);
    }
  }

  const practiceActivitiesCompleted = quizAttempts.length;
  const averagePracticeAccuracy =
    practiceActivitiesCompleted > 0
      ? Math.round(
          quizAttempts.reduce((sum, item) => sum + item.accuracyPct, 0) /
            practiceActivitiesCompleted
        )
      : 0;

  const activityDates: string[] = [
    ...wordProgress.map((p) => p.lastExploredAt),
    ...savedWords.map((s) => s.updatedAt),
    ...quizAttempts.map((q) => q.completedAt),
  ];

  const learningStreak = computeLearningStreak(activityDates, todayDateKey);

  const categoryProgress: CategoryProgressSummary[] = categories.map((cat) => {
    const catWords = words.filter((w) => w.categorySlug === cat.slug);
    let exploredCount = 0;
    let masteredCount = 0;
    let savedCount = 0;

    for (const w of catWords) {
      if (exploredWordIds.has(w.id)) exploredCount += 1;
      if (masteredWordIds.has(w.id)) masteredCount += 1;
      if (savedByWordId.has(w.id)) savedCount += 1;
    }

    return {
      slug: cat.slug,
      name: cat.name,
      totalWords: catWords.length,
      exploredCount,
      masteredCount,
      savedCount,
    };
  });

  const sortedProgress = [...wordProgress].sort(
    (a, b) =>
      new Date(b.lastExploredAt).getTime() -
      new Date(a.lastExploredAt).getTime()
  );

  const recentExplorations: RecentWordExplorationItem[] = [];
  for (const p of sortedProgress) {
    const word = wordById.get(p.wordId);
    if (!word) continue;
    const effectiveStatus = masteredWordIds.has(word.id)
      ? "MASTERED"
      : savedByWordId.get(word.id)?.status ?? p.status;
    recentExplorations.push({
      wordId: word.id,
      word: word.word,
      slug: word.slug,
      pronunciation: word.pronunciation,
      partOfSpeech: word.partOfSpeech,
      categoryName: word.categoryName,
      status: effectiveStatus,
      lastExploredAt: p.lastExploredAt,
    });
    if (recentExplorations.length >= 8) break;
  }

  return {
    wordsExplored: exploredWordIds.size,
    wordsSaved: savedWords.length,
    wordsMastered: masteredWordIds.size,
    wordsLearning: learningWordIds.size,
    practiceActivitiesCompleted,
    averagePracticeAccuracy,
    learningStreak,
    categoryProgress,
    recentExplorations,
    recentPracticeAttempts: quizAttempts.slice(0, 10),
  };
}

