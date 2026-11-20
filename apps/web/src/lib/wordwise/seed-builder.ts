import type {
  WordWiseCategorySlug,
  WordWiseDifficulty,
  WordWisePartOfSpeech,
} from "./types";

export interface SeedVocabularyWord {
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
  categorySlug: WordWiseCategorySlug;
  synonyms: string[];
  antonyms: string[];
  examples: Array<{
    id: string;
    sentence: string;
    contextNote: string;
  }>;
}

export interface CompactSeedWordInput {
  word: string;
  pronunciation: string;
  partOfSpeech: WordWisePartOfSpeech;
  difficulty: WordWiseDifficulty;
  categorySlug: WordWiseCategorySlug;
  simpleDefinition: string;
  formalDefinition: string;
  usageContext: string;
  informalEquivalent?: string | null;
  formalUsageNote?: string | null;
  synonyms: [string, string, ...string[]];
  antonyms: [string, ...string[]];
  example1: string;
  example2: string;
}

export function defineSeedWord(input: CompactSeedWordInput): SeedVocabularyWord {
  const slug = input.word
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return {
    id: `ww-word-${slug}`,
    word: input.word,
    slug,
    pronunciation: input.pronunciation,
    partOfSpeech: input.partOfSpeech,
    simpleDefinition: input.simpleDefinition,
    formalDefinition: input.formalDefinition,
    usageContext: input.usageContext,
    informalEquivalent: input.informalEquivalent ?? null,
    formalUsageNote:
      input.formalUsageNote ??
      `Use "${input.word.toLowerCase()}" in academic essays, literature reviews, and scholarly discourse.`,
    difficulty: input.difficulty,
    categorySlug: input.categorySlug,
    synonyms: [...input.synonyms],
    antonyms: [...input.antonyms],
    examples: [
      {
        id: `ww-ex-${slug}-1`,
        sentence: input.example1,
        contextNote: "Academic context",
      },
      {
        id: `ww-ex-${slug}-2`,
        sentence: input.example2,
        contextNote: "Formal application",
      },
    ],
  };
}

