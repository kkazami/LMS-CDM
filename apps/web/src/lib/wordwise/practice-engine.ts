import type {
  PracticeFeedbackItem,
  PracticeQuestionItem,
  VocabularyWordItem,
  WordWiseCategorySlug,
  WordWiseDifficulty,
  WordWiseExerciseType,
} from "./types";

function seededShuffle<T>(items: readonly T[], seedText: string): T[] {
  const result = [...items];
  let seed = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    seed ^= seedText.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  for (let i = result.length - 1; i > 0; i -= 1) {
    seed ^= i + 1;
    seed = Math.imul(seed, 1103515245) + 12345;
    const j = Math.abs(seed) % (i + 1);
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function maskWordInSentence(sentence: string, word: string): string {
  const regex = new RegExp(`\\b${escapeRegExp(word)}(?:s|es|ed|ing)?\\b`, "gi");
  if (regex.test(sentence)) {
    return sentence.replace(regex, "________");
  }
  return `${sentence} (Target term: ________)`;
}

export interface GeneratePracticeSetOptions {
  words: readonly VocabularyWordItem[];
  exerciseType: WordWiseExerciseType;
  difficulty?: WordWiseDifficulty | "ALL";
  categorySlug?: WordWiseCategorySlug | "ALL";
  questionCount?: number;
  seed?: string;
}

export function generatePracticeQuestions(
  options: GeneratePracticeSetOptions
): PracticeQuestionItem[] {
  const {
    words,
    exerciseType,
    difficulty = "ALL",
    categorySlug = "ALL",
    questionCount = 5,
    seed = `${Date.now()}`,
  } = options;

  let pool = words.filter((w) => {
    const matchesDiff = difficulty === "ALL" || w.difficulty === difficulty;
    const matchesCat =
      categorySlug === "ALL" || w.categorySlug === categorySlug;
    return matchesDiff && matchesCat;
  });

  if (pool.length < 4) {
    // Fallback to broader difficulty if a specific combination has fewer than 4 words
    pool = words.filter(
      (w) => categorySlug === "ALL" || w.categorySlug === categorySlug
    );
  }
  if (pool.length < 4) {
    pool = [...words];
  }

  const shuffledPool = seededShuffle(
    pool,
    `${seed}:${exerciseType}:${difficulty}:${categorySlug}`
  );
  const selectedWords = shuffledPool.slice(
    0,
    Math.min(questionCount, shuffledPool.length)
  );

  return selectedWords.map((target, idx) => {
    const distractors = seededShuffle(
      words.filter((w) => w.id !== target.id),
      `${seed}:distractors:${target.id}:${idx}`
    ).slice(0, 3);

    const primaryExample =
      target.examples[0]?.sentence ??
      `In professional practice, ${target.word.toLowerCase()} is essential.`;

    if (exerciseType === "MULTIPLE_CHOICE") {
      const optionsList = seededShuffle(
        [
          target.formalDefinition,
          ...distractors.map((d) => d.formalDefinition),
        ],
        `${seed}:mc:${target.id}`
      );
      return {
        id: `ww-q-mc-${target.id}-${idx}`,
        exerciseType,
        difficulty: target.difficulty,
        wordId: target.id,
        targetWord: target.word,
        pronunciation: target.pronunciation,
        partOfSpeech: target.partOfSpeech,
        categoryName: target.categoryName,
        prompt: `Which formal definition best explains the term "${target.word}"?`,
        contextSentence: primaryExample,
        options: optionsList,
        correctAnswer: target.formalDefinition,
        explanation: `"${target.word}" (${target.partOfSpeech}) means: ${target.formalDefinition} Context: ${target.usageContext}`,
      };
    }

    if (exerciseType === "WORD_MATCHING") {
      const pairWords = seededShuffle(
        [target, ...distractors],
        `${seed}:wm-pairs:${target.id}`
      );
      const optionsList = seededShuffle(
        pairWords.map((w) => w.word),
        `${seed}:wm-opts:${target.id}`
      );
      return {
        id: `ww-q-wm-${target.id}-${idx}`,
        exerciseType,
        difficulty: target.difficulty,
        wordId: target.id,
        targetWord: target.word,
        pronunciation: target.pronunciation,
        partOfSpeech: target.partOfSpeech,
        categoryName: target.categoryName,
        prompt: `Match the following definition to its correct vocabulary term: "${target.simpleDefinition}"`,
        contextSentence: primaryExample,
        options: optionsList,
        matchingPairs: pairWords.map((w) => ({
          wordId: w.id,
          word: w.word,
          pronunciation: w.pronunciation,
          definition: w.simpleDefinition,
        })),
        correctAnswer: target.word,
        explanation: `"${target.word}" ${target.pronunciation} matches "${target.simpleDefinition}". Synonyms include: ${target.synonyms.join(", ")}.`,
      };
    }

    if (exerciseType === "FILL_IN_BLANKS") {
      const blankedSentence = maskWordInSentence(primaryExample, target.word);
      const optionsList = seededShuffle(
        [target.word, ...distractors.map((d) => d.word)],
        `${seed}:fib:${target.id}`
      );
      return {
        id: `ww-q-fib-${target.id}-${idx}`,
        exerciseType,
        difficulty: target.difficulty,
        wordId: target.id,
        targetWord: target.word,
        pronunciation: target.pronunciation,
        partOfSpeech: target.partOfSpeech,
        categoryName: target.categoryName,
        prompt: `Select the vocabulary word that accurately completes the sentence: "${blankedSentence}"`,
        contextSentence: primaryExample,
        options: optionsList,
        correctAnswer: target.word,
        explanation: `The complete sentence is: "${primaryExample}" — "${target.word}" means ${target.simpleDefinition.toLowerCase()}`,
      };
    }

    if (exerciseType === "FORMAL_REPLACEMENT") {
      const informal = target.informalEquivalent ?? "everyday expression";
      const optionsList = seededShuffle(
        [target.word, ...distractors.map((d) => d.word)],
        `${seed}:fr:${target.id}`
      );
      return {
        id: `ww-q-fr-${target.id}-${idx}`,
        exerciseType,
        difficulty: target.difficulty,
        wordId: target.id,
        targetWord: target.word,
        pronunciation: target.pronunciation,
        partOfSpeech: target.partOfSpeech,
        categoryName: target.categoryName,
        prompt: `Which formal or academic vocabulary term best replaces the informal expression "${informal}" in professional writing?`,
        contextSentence: primaryExample,
        informalPhraseToReplace: informal,
        options: optionsList,
        correctAnswer: target.word,
        explanation:
          target.formalUsageNote ??
          `Use "${target.word}" instead of "${informal}" in formal academic and business communication.`,
      };
    }

    // SENTENCE_CONSTRUCTION
    const distractorExample =
      distractors[0]?.examples[0]?.sentence ??
      `We casually talked about ${target.word.toLowerCase()} without any clear structure.`;
    const informalDistractor1 = `The team kind of used ${target.word.toLowerCase()} to sort of fix a lot of stuff quickly.`;
    const informalDistractor2 = `Let us just ${target.word.toLowerCase()} whenever somebody feels like doing it.`;
    const optionsList = seededShuffle(
      [
        primaryExample,
        informalDistractor1,
        informalDistractor2,
        distractorExample,
      ],
      `${seed}:sc:${target.id}`
    );

    return {
      id: `ww-q-sc-${target.id}-${idx}`,
      exerciseType: "SENTENCE_CONSTRUCTION",
      difficulty: target.difficulty,
      wordId: target.id,
      targetWord: target.word,
      pronunciation: target.pronunciation,
      partOfSpeech: target.partOfSpeech,
      categoryName: target.categoryName,
      prompt: `Select the most professional, grammatically sound academic/business sentence that uses "${target.word}" (${target.partOfSpeech}) appropriately:`,
      contextSentence: primaryExample,
      options: optionsList,
      correctAnswer: primaryExample,
      explanation: `"${primaryExample}" demonstrates accurate formal usage of "${target.word}" (${target.usageContext}).`,
    };
  });
}

export interface GradePracticeAttemptInput {
  questions: readonly PracticeQuestionItem[];
  answers: Record<string, string>;
}

export interface GradedPracticeOutcome {
  totalQuestions: number;
  correctAnswers: number;
  accuracyPct: number;
  feedbackItems: PracticeFeedbackItem[];
}

export function gradePracticeAttempt(
  input: GradePracticeAttemptInput
): GradedPracticeOutcome {
  const { questions, answers } = input;
  const feedbackItems: PracticeFeedbackItem[] = questions.map((q) => {
    const rawStudentAnswer = (answers[q.id] ?? "").trim();
    const isCorrect =
      rawStudentAnswer.toLowerCase() === q.correctAnswer.trim().toLowerCase();
    return {
      questionId: q.id,
      wordId: q.wordId,
      targetWord: q.targetWord,
      prompt: q.prompt,
      studentAnswer: rawStudentAnswer || "(No answer selected)",
      correctAnswer: q.correctAnswer,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const totalQuestions = feedbackItems.length;
  const correctAnswers = feedbackItems.filter((item) => item.isCorrect).length;
  const accuracyPct =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  return {
    totalQuestions,
    correctAnswers,
    accuracyPct,
    feedbackItems,
  };
}

