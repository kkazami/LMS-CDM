import type { FormOption, FormQuestionData } from "@/types/forms";

/**
 * Simple pseudo-random number generator seeded with a string.
 * Ensures the student sees the exact same shuffle if they refresh the attempt.
 */
function createSeededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  return function next() {
    hash = (hash * 9301 + 49297) % 233280;
    return Math.abs(hash / 233280);
  };
}

export function shuffleArray<T>(array: T[], seed?: string): T[] {
  const result = [...array];
  const random = seed ? createSeededRandom(seed) : Math.random;

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function shuffleQuestionsAndOptions(
  questions: FormQuestionData[],
  attemptSeed: string,
  shuffleQuestions: boolean,
  shuffleOptions: boolean
): FormQuestionData[] {
  let processed = questions.map((q) => {
    // If shuffling options and this question has choices
    if (shuffleOptions && q.config?.options && q.config.options.length > 1) {
      const shuffledOptions = shuffleArray<FormOption>(q.config.options, `${attemptSeed}-opt-${q.id}`);
      return {
        ...q,
        config: {
          ...q.config,
          options: shuffledOptions,
        },
      };
    }
    return q;
  });

  if (shuffleQuestions) {
    // Keep section headers in their relative anchors or shuffle questions between them
    // Separate by sectionId or shuffle questions while keeping section headers
    const headers = processed.filter((q) => q.questionType === "SECTION_HEADER");
    const nonHeaders = processed.filter((q) => q.questionType !== "SECTION_HEADER");

    if (headers.length === 0) {
      processed = shuffleArray(processed, `${attemptSeed}-questions`);
    } else {
      // If there are section headers, shuffle only questions within each section
      const sectionsMap = new Map<string | null, FormQuestionData[]>();
      processed.forEach((q) => {
        const sec = q.sectionId || null;
        const list = sectionsMap.get(sec) || [];
        list.push(q);
        sectionsMap.set(sec, list);
      });

      const reassembled: FormQuestionData[] = [];
      sectionsMap.forEach((items, secKey) => {
        const secHeaders = items.filter((q) => q.questionType === "SECTION_HEADER");
        const secQuestions = items.filter((q) => q.questionType !== "SECTION_HEADER");
        const shuffled = shuffleArray(secQuestions, `${attemptSeed}-sec-${secKey || "root"}`);
        reassembled.push(...secHeaders, ...shuffled);
      });

      processed = reassembled;
    }
  }

  return processed;
}
