import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import {
  CORE_CATEGORY_SEED_WORDS,
  FORMAL_INFORMAL_COMPARISONS,
  SEED_VOCABULARY_WORDS,
  WORDWISE_CATEGORIES,
  buildCoreCategoryVocabularyWords,
  buildInMemoryVocabularyWords,
  getDeterministicWordOfTheDay,
  getTodayDateKey,
} from "./content-bank";
import {
  lookupGeneralEnglishWord,
  searchExtendedGeneralLexicon,
} from "./general-dictionary";
import { rankAndFilterVocabularyWords } from "./search-ranking";
import { buildWordWiseProgressSummary } from "./progress";
import type {
  PersonalVocabularyListRecord,
  PracticeAttemptRecord,
  PracticeFeedbackItem,
  SavedVocabularyRecord,
  StudentWordProgressRecord,
  VocabularyCategoryItem,
  VocabularyWordItem,
  WordWiseCategorySlug,
  WordWiseDifficulty,
  WordWiseExerciseType,
  WordWiseInitialPayload,
  WordWisePartOfSpeech,
  WordWiseProgressStatus,
  WordWiseSavedStatus,
} from "./types";

let verifiedSeedWordCount = 0;

function hasPrismaWordWiseModels(): boolean {
  return (
    "vocabularyCategory" in (db as object) &&
    "vocabularyWord" in (db as object) &&
    "studentSavedWord" in (db as object) &&
    "studentVocabularyProgress" in (db as object) &&
    "vocabularyQuizAttempt" in (db as object) &&
    "vocabularyPersonalList" in (db as object) &&
    "vocabularyPersonalListWord" in (db as object)
  );
}

async function initializeWordWiseSchemaAndSeed(): Promise<void> {
  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "VocabularyCategory" (
      "id" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VocabularyCategory_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyCategory_slug_key" ON "VocabularyCategory"("slug")`,
    `CREATE TABLE IF NOT EXISTS "VocabularyWord" (
      "id" TEXT NOT NULL,
      "word" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "pronunciation" TEXT NOT NULL,
      "partOfSpeech" TEXT NOT NULL,
      "simpleDefinition" TEXT NOT NULL,
      "formalDefinition" TEXT NOT NULL,
      "usageContext" TEXT NOT NULL,
      "informalEquivalent" TEXT,
      "formalUsageNote" TEXT,
      "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
      "categoryId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "VocabularyWord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "VocabularyCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyWord_word_key" ON "VocabularyWord"("word")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyWord_slug_key" ON "VocabularyWord"("slug")`,
    `CREATE INDEX IF NOT EXISTS "VocabularyWord_categoryId_idx" ON "VocabularyWord"("categoryId")`,
    `CREATE INDEX IF NOT EXISTS "VocabularyWord_difficulty_idx" ON "VocabularyWord"("difficulty")`,
    `CREATE TABLE IF NOT EXISTS "VocabularySynonym" (
      "id" TEXT NOT NULL,
      "wordId" TEXT NOT NULL,
      "term" TEXT NOT NULL,
      "relation" TEXT NOT NULL DEFAULT 'SYNONYM',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VocabularySynonym_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "VocabularySynonym_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VocabularySynonym_wordId_term_relation_key" ON "VocabularySynonym"("wordId", "term", "relation")`,
    `CREATE INDEX IF NOT EXISTS "VocabularySynonym_wordId_idx" ON "VocabularySynonym"("wordId")`,
    `CREATE TABLE IF NOT EXISTS "VocabularyExample" (
      "id" TEXT NOT NULL,
      "wordId" TEXT NOT NULL,
      "sentence" TEXT NOT NULL,
      "contextNote" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VocabularyExample_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "VocabularyExample_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "VocabularyExample_wordId_idx" ON "VocabularyExample"("wordId")`,
    `CREATE TABLE IF NOT EXISTS "StudentSavedWord" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "wordId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'LEARNING',
      "notes" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudentSavedWord_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "StudentSavedWord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StudentSavedWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "StudentSavedWord_studentId_wordId_key" ON "StudentSavedWord"("studentId", "wordId")`,
    `CREATE INDEX IF NOT EXISTS "StudentSavedWord_studentId_status_idx" ON "StudentSavedWord"("studentId", "status")`,
    `CREATE TABLE IF NOT EXISTS "StudentVocabularyProgress" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "wordId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'EXPLORED',
      "exploredCount" INTEGER NOT NULL DEFAULT 1,
      "practiceCount" INTEGER NOT NULL DEFAULT 0,
      "correctCount" INTEGER NOT NULL DEFAULT 0,
      "lastExploredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "masteredAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudentVocabularyProgress_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "StudentVocabularyProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "StudentVocabularyProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "StudentVocabularyProgress_studentId_wordId_key" ON "StudentVocabularyProgress"("studentId", "wordId")`,
    `CREATE INDEX IF NOT EXISTS "StudentVocabularyProgress_studentId_status_idx" ON "StudentVocabularyProgress"("studentId", "status")`,
    `CREATE INDEX IF NOT EXISTS "StudentVocabularyProgress_studentId_lastExploredAt_idx" ON "StudentVocabularyProgress"("studentId", "lastExploredAt")`,
    `CREATE TABLE IF NOT EXISTS "VocabularyQuizAttempt" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "exerciseType" TEXT NOT NULL,
      "difficulty" TEXT NOT NULL,
      "categorySlug" TEXT,
      "totalQuestions" INTEGER NOT NULL,
      "correctAnswers" INTEGER NOT NULL,
      "accuracyPct" INTEGER NOT NULL,
      "details" JSONB NOT NULL,
      "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VocabularyQuizAttempt_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "VocabularyQuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS "VocabularyQuizAttempt_studentId_completedAt_idx" ON "VocabularyQuizAttempt"("studentId", "completedAt")`,
    `CREATE INDEX IF NOT EXISTS "VocabularyQuizAttempt_studentId_exerciseType_idx" ON "VocabularyQuizAttempt"("studentId", "exerciseType")`,
    `CREATE TABLE IF NOT EXISTS "VocabularyPersonalList" (
      "id" TEXT NOT NULL,
      "studentId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VocabularyPersonalList_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "VocabularyPersonalList_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyPersonalList_studentId_name_key" ON "VocabularyPersonalList"("studentId", "name")`,
    `CREATE INDEX IF NOT EXISTS "VocabularyPersonalList_studentId_idx" ON "VocabularyPersonalList"("studentId")`,
    `CREATE TABLE IF NOT EXISTS "VocabularyPersonalListWord" (
      "id" TEXT NOT NULL,
      "listId" TEXT NOT NULL,
      "wordId" TEXT NOT NULL,
      "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VocabularyPersonalListWord_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "VocabularyPersonalListWord_listId_fkey" FOREIGN KEY ("listId") REFERENCES "VocabularyPersonalList"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "VocabularyPersonalListWord_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "VocabularyWord"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "VocabularyPersonalListWord_listId_wordId_key" ON "VocabularyPersonalListWord"("listId", "wordId")`,
    `DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lms_web_runtime_v1') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
          "VocabularyCategory",
          "VocabularyWord",
          "VocabularySynonym",
          "VocabularyExample",
          "StudentSavedWord",
          "StudentVocabularyProgress",
          "VocabularyQuizAttempt",
          "VocabularyPersonalList",
          "VocabularyPersonalListWord"
        TO lms_web_runtime_v1;
      END IF;
    END $$`,
  ];

  for (const sql of ddlStatements) {
    try {
      await db.$executeRawUnsafe(sql);
    } catch (err) {
      console.warn(
        "[ensureWordWiseTablesAndContent] DDL warning:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // Seed categories & words using raw parameterized SQL so it works even if next dev has a pre-generate PrismaClient in memory
  try {
    // Remove retired business/HR-specific categories so the hub displays general student academic & formal categories
    await db.$executeRawUnsafe(
      `DELETE FROM "VocabularyCategory"
       WHERE "slug" IN ('business-terminology', 'human-resource-management', 'entrepreneurship', 'professional-communication')`
    );

    for (const cat of WORDWISE_CATEGORIES) {
      await db.$executeRawUnsafe(
        `INSERT INTO "VocabularyCategory" ("id", "slug", "name", "description", "sortOrder", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT ("slug") DO UPDATE SET
           "name" = EXCLUDED."name",
           "description" = EXCLUDED."description",
           "sortOrder" = EXCLUDED."sortOrder",
           "updatedAt" = CURRENT_TIMESTAMP`,
        cat.id,
        cat.slug,
        cat.name,
        cat.description,
        cat.sortOrder
      );
    }

    const catBySlug = new Map(
      WORDWISE_CATEGORIES.map((c) => [c.slug, c.id] as const)
    );

    const batchSize = 25;
    for (let start = 0; start < CORE_CATEGORY_SEED_WORDS.length; start += batchSize) {
      const chunk = CORE_CATEGORY_SEED_WORDS.slice(start, start + batchSize);
      await Promise.all(
        chunk.map(async (seedWord) => {
          const catId = catBySlug.get(seedWord.categorySlug);
          if (!catId) return;

          await db.$executeRawUnsafe(
            `INSERT INTO "VocabularyWord" (
              "id", "word", "slug", "pronunciation", "partOfSpeech",
              "simpleDefinition", "formalDefinition", "usageContext",
              "informalEquivalent", "formalUsageNote", "difficulty", "categoryId", "updatedAt"
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CURRENT_TIMESTAMP)
            ON CONFLICT ("slug") DO UPDATE SET
              "word" = EXCLUDED."word",
              "pronunciation" = EXCLUDED."pronunciation",
              "partOfSpeech" = EXCLUDED."partOfSpeech",
              "simpleDefinition" = EXCLUDED."simpleDefinition",
              "formalDefinition" = EXCLUDED."formalDefinition",
              "usageContext" = EXCLUDED."usageContext",
              "informalEquivalent" = EXCLUDED."informalEquivalent",
              "formalUsageNote" = EXCLUDED."formalUsageNote",
              "difficulty" = EXCLUDED."difficulty",
              "categoryId" = EXCLUDED."categoryId",
              "updatedAt" = CURRENT_TIMESTAMP`,
            seedWord.id,
            seedWord.word,
            seedWord.slug,
            seedWord.pronunciation,
            seedWord.partOfSpeech,
            seedWord.simpleDefinition,
            seedWord.formalDefinition,
            seedWord.usageContext,
            seedWord.informalEquivalent,
            seedWord.formalUsageNote,
            seedWord.difficulty,
            catId
          );

          await Promise.all([
            ...seedWord.synonyms.map((syn) =>
              db.$executeRawUnsafe(
                `INSERT INTO "VocabularySynonym" ("id", "wordId", "term", "relation")
                 VALUES ($1, $2, $3, 'SYNONYM')
                 ON CONFLICT ("wordId", "term", "relation") DO NOTHING`,
                `ww-syn-${seedWord.slug}-${syn.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                seedWord.id,
                syn
              )
            ),
            ...seedWord.antonyms.map((ant) =>
              db.$executeRawUnsafe(
                `INSERT INTO "VocabularySynonym" ("id", "wordId", "term", "relation")
                 VALUES ($1, $2, $3, 'ANTONYM')
                 ON CONFLICT ("wordId", "term", "relation") DO NOTHING`,
                `ww-ant-${seedWord.slug}-${ant.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                seedWord.id,
                ant
              )
            ),
            ...seedWord.examples.map((ex, i) =>
              db.$executeRawUnsafe(
                `INSERT INTO "VocabularyExample" ("id", "wordId", "sentence", "contextNote", "sortOrder")
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT ("id") DO UPDATE SET
                   "sentence" = EXCLUDED."sentence",
                   "contextNote" = EXCLUDED."contextNote",
                   "sortOrder" = EXCLUDED."sortOrder"`,
                ex.id,
                seedWord.id,
                ex.sentence,
                ex.contextNote,
                i + 1
              )
            ),
          ]);
        })
      );
    }
    verifiedSeedWordCount = CORE_CATEGORY_SEED_WORDS.length;
  } catch (err) {
    console.warn(
      "[ensureWordWiseTablesAndContent] Seed warning:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function ensureWordWiseTablesAndContent(): Promise<void> {
  if (verifiedSeedWordCount >= 150) return;
  try {
    const existingCountRows = await db.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(*)::int AS cnt FROM "VocabularyWord" WHERE "id" LIKE 'ww-word-%'`
    );
    if ((existingCountRows[0]?.cnt ?? 0) >= 150) {
      verifiedSeedWordCount = existingCountRows[0]!.cnt;
      return;
    }
  } catch {
    // Table does not exist yet or needs initial seed
  }
  await initializeWordWiseSchemaAndSeed();
}

export async function persistLookedUpWordToDb(
  wordItem: VocabularyWordItem
): Promise<VocabularyWordItem> {
  await ensureWordWiseTablesAndContent();
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO "VocabularyWord" (
        "id", "word", "slug", "pronunciation", "partOfSpeech",
        "simpleDefinition", "formalDefinition", "usageContext",
        "informalEquivalent", "formalUsageNote", "difficulty", "categoryId", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, CURRENT_TIMESTAMP)
      ON CONFLICT ("slug") DO UPDATE SET
        "updatedAt" = CURRENT_TIMESTAMP`,
      wordItem.id,
      wordItem.word,
      wordItem.slug,
      wordItem.pronunciation,
      wordItem.partOfSpeech,
      wordItem.simpleDefinition,
      wordItem.formalDefinition,
      wordItem.usageContext,
      wordItem.informalEquivalent,
      wordItem.formalUsageNote,
      wordItem.difficulty,
      wordItem.categoryId
    );

    const existingRows = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "VocabularyWord" WHERE "slug" = $1 LIMIT 1`,
      wordItem.slug
    );
    const resolvedId = existingRows[0]?.id ?? wordItem.id;

    for (const syn of wordItem.synonyms) {
      await db.$executeRawUnsafe(
        `INSERT INTO "VocabularySynonym" ("id", "wordId", "term", "relation")
         VALUES ($1, $2, $3, 'SYNONYM')
         ON CONFLICT ("wordId", "term", "relation") DO NOTHING`,
        `ww-syn-${wordItem.slug}-${syn.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        resolvedId,
        syn
      );
    }

    for (const ant of wordItem.antonyms) {
      await db.$executeRawUnsafe(
        `INSERT INTO "VocabularySynonym" ("id", "wordId", "term", "relation")
         VALUES ($1, $2, $3, 'ANTONYM')
         ON CONFLICT ("wordId", "term", "relation") DO NOTHING`,
        `ww-ant-${wordItem.slug}-${ant.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        resolvedId,
        ant
      );
    }

    for (let i = 0; i < wordItem.examples.length; i += 1) {
      const ex = wordItem.examples[i]!;
      await db.$executeRawUnsafe(
        `INSERT INTO "VocabularyExample" ("id", "wordId", "sentence", "contextNote", "sortOrder")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("id") DO NOTHING`,
        ex.id,
        resolvedId,
        ex.sentence,
        ex.contextNote,
        i + 1
      );
    }

    return { ...wordItem, id: resolvedId };
  } catch {
    return wordItem;
  }
}

export async function wordExistsInDbOrSeed(wordId: string): Promise<boolean> {
  if (SEED_VOCABULARY_WORDS.some((w) => w.id === wordId)) {
    return true;
  }
  await ensureWordWiseTablesAndContent();
  try {
    const rows = await db.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT "id" FROM "VocabularyWord" WHERE "id" = $1 LIMIT 1`,
      wordId
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

function mapDbWordToItem(row: {
  id: string;
  word: string;
  slug: string;
  pronunciation: string;
  partOfSpeech: string;
  simpleDefinition: string;
  formalDefinition: string;
  usageContext: string;
  informalEquivalent: string | null;
  formalUsageNote: string | null;
  difficulty: string;
  categoryId: string;
  category: { slug: string; name: string };
  synonyms: Array<{ term: string; relation: string }>;
  examples: Array<{ id: string; sentence: string; contextNote: string | null }>;
}): VocabularyWordItem {
  return {
    id: row.id,
    word: row.word,
    slug: row.slug,
    pronunciation: row.pronunciation,
    partOfSpeech: row.partOfSpeech as WordWisePartOfSpeech,
    simpleDefinition: row.simpleDefinition,
    formalDefinition: row.formalDefinition,
    usageContext: row.usageContext,
    informalEquivalent: row.informalEquivalent,
    formalUsageNote: row.formalUsageNote,
    difficulty: row.difficulty as WordWiseDifficulty,
    categoryId: row.categoryId,
    categorySlug: row.category.slug as WordWiseCategorySlug,
    categoryName: row.category.name,
    synonyms: row.synonyms
      .filter((s) => s.relation === "SYNONYM")
      .map((s) => s.term),
    antonyms: row.synonyms
      .filter((s) => s.relation === "ANTONYM")
      .map((s) => s.term),
    examples: row.examples.map((ex) => ({
      id: ex.id,
      sentence: ex.sentence,
      contextNote: ex.contextNote,
    })),
  };
}

export interface DictionaryQueryOptions {
  search?: string;
  categorySlug?: string;
  partOfSpeech?: string;
  difficulty?: string;
  page?: number;
  pageSize?: number;
}

export interface DictionaryQueryResult {
  items: VocabularyWordItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function queryWordWiseDictionaryFromDb(
  options: DictionaryQueryOptions
): Promise<DictionaryQueryResult> {
  await ensureWordWiseTablesAndContent();

  const search = (options.search ?? "").trim();
  const categorySlug = (options.categorySlug ?? "ALL").trim();
  const partOfSpeech = (options.partOfSpeech ?? "ALL").trim();
  const difficulty = (options.difficulty ?? "ALL").trim();
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(36, Math.max(1, Number(options.pageSize) || 9));

  // If the student is searching for a specific English word, enrich from the general English dictionary in memory (0 Neon DB writes on search)
  let lookedUpItem: VocabularyWordItem | null = null;
  if (search.length >= 2 && page === 1) {
    const extendedMatches = searchExtendedGeneralLexicon(search);
    const exactSeedOrExt =
      SEED_VOCABULARY_WORDS.some(
        (w) => w.word.toLowerCase() === search.toLowerCase()
      ) ||
      extendedMatches.some(
        (w) => w.word.toLowerCase() === search.toLowerCase()
      );
    if (!exactSeedOrExt) {
      lookedUpItem = await lookupGeneralEnglishWord(search);
    }
  }

  if (hasPrismaWordWiseModels()) {
    try {
      const whereClause: Record<string, unknown> = {};

      if (categorySlug && categorySlug !== "ALL") {
        whereClause.category = { slug: categorySlug };
      }
      if (partOfSpeech && partOfSpeech !== "ALL") {
        whereClause.partOfSpeech = partOfSpeech;
      }
      if (difficulty && difficulty !== "ALL") {
        whereClause.difficulty = difficulty;
      }
      if (search) {
        if (search.length < 3) {
          whereClause.OR = [
            { word: { startsWith: search, mode: "insensitive" } },
            {
              synonyms: {
                some: { term: { startsWith: search, mode: "insensitive" } },
              },
            },
          ];
        } else {
          whereClause.OR = [
            { word: { contains: search, mode: "insensitive" } },
            { simpleDefinition: { contains: search, mode: "insensitive" } },
            { formalDefinition: { contains: search, mode: "insensitive" } },
            { usageContext: { contains: search, mode: "insensitive" } },
            { informalEquivalent: { contains: search, mode: "insensitive" } },
            {
              synonyms: {
                some: { term: { contains: search, mode: "insensitive" } },
              },
            },
          ];
        }
      }

      const [total, rows] = await Promise.all([
        db.vocabularyWord.count({ where: whereClause }),
        db.vocabularyWord.findMany({
          where: whereClause,
          include: {
            category: { select: { slug: true, name: true } },
            synonyms: { select: { term: true, relation: true } },
            examples: {
              orderBy: { sortOrder: "asc" },
              select: { id: true, sentence: true, contextNote: true },
            },
          },
          orderBy: [{ word: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      const isUnfiltered =
        !search &&
        categorySlug === "ALL" &&
        partOfSpeech === "ALL" &&
        difficulty === "ALL";
      if (
        (isUnfiltered && total >= SEED_VOCABULARY_WORDS.length) ||
        (!isUnfiltered && (total > 0 || lookedUpItem))
      ) {
        let mapped = rows.map(mapDbWordToItem);
        if (
          lookedUpItem &&
          !mapped.some((item) => item.slug === lookedUpItem!.slug)
        ) {
          mapped.unshift(lookedUpItem);
        }
        if (search) {
          mapped = rankAndFilterVocabularyWords(mapped, search);
        }
        const finalTotal = Math.max(total, mapped.length);
        const totalPages = Math.max(1, Math.ceil(finalTotal / pageSize));
        return {
          items: mapped.slice(0, pageSize),
          total: finalTotal,
          page,
          pageSize,
          totalPages,
        };
      }
    } catch (err) {
      console.warn(
        "[queryWordWiseDictionaryFromDb] Falling back to in-memory catalog:",
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  // Fallback filter over curated catalog + extended general lexicon + looked-up item
  const baseWords = buildInMemoryVocabularyWords();
  const extendedWords = searchExtendedGeneralLexicon("");
  const combinedMap = new Map<string, VocabularyWordItem>();
  for (const w of [...baseWords, ...extendedWords]) {
    combinedMap.set(w.slug, w);
  }
  if (lookedUpItem) {
    combinedMap.set(lookedUpItem.slug, lookedUpItem);
  }
  const allWords = Array.from(combinedMap.values());
  const ranked = rankAndFilterVocabularyWords(allWords, search, {
    categorySlug,
    partOfSpeech,
    difficulty,
  });

  const total = ranked.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;

  return {
    items: ranked.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

let cachedInMemoryCatalog: {
  categories: VocabularyCategoryItem[];
  words: VocabularyWordItem[];
} | null = null;

export async function loadAllVocabularyWordsFromDb(): Promise<{
  categories: VocabularyCategoryItem[];
  words: VocabularyWordItem[];
}> {
  if (cachedInMemoryCatalog) {
    return cachedInMemoryCatalog;
  }

  const words = buildCoreCategoryVocabularyWords().sort((a, b) =>
    a.word.localeCompare(b.word)
  );
  const categories: VocabularyCategoryItem[] = WORDWISE_CATEGORIES.map((c) => ({
    ...c,
    wordCount: words.filter((w) => w.categorySlug === c.slug).length,
  }));

  cachedInMemoryCatalog = { categories, words };
  return cachedInMemoryCatalog;
}

export async function loadStudentWordWiseState(studentId: string): Promise<{
  savedWords: SavedVocabularyRecord[];
  wordProgress: StudentWordProgressRecord[];
  personalLists: PersonalVocabularyListRecord[];
  quizAttempts: PracticeAttemptRecord[];
}> {
  await ensureWordWiseTablesAndContent();

  try {
    const [savedRows, progressRows, listRows, listWordRows, quizRows] =
      await Promise.all([
        db.$queryRawUnsafe<
          Array<{
            id: string;
            wordId: string;
            status: string;
            notes: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >(
          `SELECT "id", "wordId", "status", "notes", "createdAt", "updatedAt"
           FROM "StudentSavedWord"
           WHERE "studentId" = $1
           ORDER BY "updatedAt" DESC`,
          studentId
        ),
        db.$queryRawUnsafe<
          Array<{
            wordId: string;
            status: string;
            exploredCount: number;
            practiceCount: number;
            correctCount: number;
            lastExploredAt: Date;
            masteredAt: Date | null;
          }>
        >(
          `SELECT "wordId", "status", "exploredCount", "practiceCount", "correctCount", "lastExploredAt", "masteredAt"
           FROM "StudentVocabularyProgress"
           WHERE "studentId" = $1
           ORDER BY "lastExploredAt" DESC`,
          studentId
        ),
        db.$queryRawUnsafe<
          Array<{
            id: string;
            name: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
          }>
        >(
          `SELECT "id", "name", "description", "createdAt", "updatedAt"
           FROM "VocabularyPersonalList"
           WHERE "studentId" = $1
           ORDER BY "updatedAt" DESC`,
          studentId
        ),
        db.$queryRawUnsafe<
          Array<{
            listId: string;
            wordId: string;
          }>
        >(
          `SELECT lw."listId", lw."wordId"
           FROM "VocabularyPersonalListWord" lw
           INNER JOIN "VocabularyPersonalList" l ON l."id" = lw."listId"
           WHERE l."studentId" = $1
           ORDER BY lw."addedAt" DESC`,
          studentId
        ),
        db.$queryRawUnsafe<
          Array<{
            id: string;
            exerciseType: string;
            difficulty: string;
            categorySlug: string | null;
            totalQuestions: number;
            correctAnswers: number;
            accuracyPct: number;
            details: unknown;
            completedAt: Date;
          }>
        >(
          `SELECT "id", "exerciseType", "difficulty", "categorySlug", "totalQuestions", "correctAnswers", "accuracyPct", "details", "completedAt"
           FROM "VocabularyQuizAttempt"
           WHERE "studentId" = $1
           ORDER BY "completedAt" DESC
           LIMIT 30`,
          studentId
        ),
      ]);

    const savedWords: SavedVocabularyRecord[] = savedRows.map((row) => ({
      id: row.id,
      wordId: row.wordId,
      status: (row.status === "MASTERED"
        ? "MASTERED"
        : "LEARNING") as WordWiseSavedStatus,
      notes: row.notes ?? "",
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));

    const wordProgress: StudentWordProgressRecord[] = progressRows.map(
      (row) => ({
        wordId: row.wordId,
        status: (row.status === "MASTERED"
          ? "MASTERED"
          : row.status === "LEARNING"
          ? "LEARNING"
          : "EXPLORED") as WordWiseProgressStatus,
        exploredCount: Number(row.exploredCount) || 1,
        practiceCount: Number(row.practiceCount) || 0,
        correctCount: Number(row.correctCount) || 0,
        lastExploredAt: new Date(row.lastExploredAt).toISOString(),
        masteredAt: row.masteredAt
          ? new Date(row.masteredAt).toISOString()
          : null,
      })
    );

    const wordsByListId = new Map<string, string[]>();
    for (const lw of listWordRows) {
      const arr = wordsByListId.get(lw.listId) ?? [];
      arr.push(lw.wordId);
      wordsByListId.set(lw.listId, arr);
    }

    const personalLists: PersonalVocabularyListRecord[] = listRows.map(
      (row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? "",
        wordIds: wordsByListId.get(row.id) ?? [],
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      })
    );

    const quizAttempts: PracticeAttemptRecord[] = quizRows.map((row) => {
      const detailsObj =
        row.details && typeof row.details === "object"
          ? (row.details as { feedbackItems?: PracticeFeedbackItem[] })
          : {};
      return {
        id: row.id,
        exerciseType: row.exerciseType as WordWiseExerciseType,
        difficulty: row.difficulty as WordWiseDifficulty,
        categorySlug: row.categorySlug,
        totalQuestions: Number(row.totalQuestions) || 0,
        correctAnswers: Number(row.correctAnswers) || 0,
        accuracyPct: Number(row.accuracyPct) || 0,
        completedAt: new Date(row.completedAt).toISOString(),
        feedbackItems: Array.isArray(detailsObj.feedbackItems)
          ? detailsObj.feedbackItems
          : [],
      };
    });

    return {
      savedWords,
      wordProgress,
      personalLists,
      quizAttempts,
    };
  } catch (err) {
    console.warn(
      "[loadStudentWordWiseState] Warning loading student state:",
      err instanceof Error ? err.message : String(err)
    );
    return {
      savedWords: [],
      wordProgress: [],
      personalLists: [],
      quizAttempts: [],
    };
  }
}

export async function recordStudentWordExplorationInDb(params: {
  studentId: string;
  wordId: string;
  requestedStatus?: "LEARNING" | "MASTERED";
}): Promise<void> {
  await ensureWordWiseTablesAndContent();
  const id = `ww-prog-${randomUUID()}`;
  const status = params.requestedStatus ?? "EXPLORED";
  await db.$executeRawUnsafe(
    `INSERT INTO "StudentVocabularyProgress" (
      "id", "studentId", "wordId", "status", "exploredCount", "lastExploredAt", "masteredAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, 1, CURRENT_TIMESTAMP,
      CASE WHEN $4 = 'MASTERED' THEN CURRENT_TIMESTAMP ELSE NULL END,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("studentId", "wordId") DO UPDATE SET
      "exploredCount" = "StudentVocabularyProgress"."exploredCount" + 1,
      "status" = CASE
        WHEN $4 = 'MASTERED' THEN 'MASTERED'
        WHEN "StudentVocabularyProgress"."status" = 'MASTERED' THEN 'MASTERED'
        WHEN $4 = 'LEARNING' THEN 'LEARNING'
        ELSE "StudentVocabularyProgress"."status"
      END,
      "lastExploredAt" = CURRENT_TIMESTAMP,
      "masteredAt" = CASE
        WHEN $4 = 'MASTERED' AND "StudentVocabularyProgress"."masteredAt" IS NULL THEN CURRENT_TIMESTAMP
        ELSE "StudentVocabularyProgress"."masteredAt"
      END,
      "updatedAt" = CURRENT_TIMESTAMP`,
    id,
    params.studentId,
    params.wordId,
    status
  );
}

export async function upsertStudentSavedWordInDb(params: {
  studentId: string;
  wordId: string;
  status: "LEARNING" | "MASTERED";
  notes?: string;
}): Promise<void> {
  await ensureWordWiseTablesAndContent();
  const savedId = `ww-save-${randomUUID()}`;
  const progId = `ww-prog-${randomUUID()}`;

  if (params.notes !== undefined) {
    await db.$executeRawUnsafe(
      `INSERT INTO "StudentSavedWord" ("id", "studentId", "wordId", "status", "notes", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT ("studentId", "wordId") DO UPDATE SET
         "status" = EXCLUDED."status",
         "notes" = EXCLUDED."notes",
         "updatedAt" = CURRENT_TIMESTAMP`,
      savedId,
      params.studentId,
      params.wordId,
      params.status,
      params.notes
    );
  } else {
    await db.$executeRawUnsafe(
      `INSERT INTO "StudentSavedWord" ("id", "studentId", "wordId", "status", "notes", "updatedAt")
       VALUES ($1, $2, $3, $4, '', CURRENT_TIMESTAMP)
       ON CONFLICT ("studentId", "wordId") DO UPDATE SET
         "status" = EXCLUDED."status",
         "updatedAt" = CURRENT_TIMESTAMP`,
      savedId,
      params.studentId,
      params.wordId,
      params.status
    );
  }

  await db.$executeRawUnsafe(
    `INSERT INTO "StudentVocabularyProgress" (
      "id", "studentId", "wordId", "status", "exploredCount", "lastExploredAt", "masteredAt", "updatedAt"
    ) VALUES (
      $1, $2, $3, $4, 1, CURRENT_TIMESTAMP,
      CASE WHEN $4 = 'MASTERED' THEN CURRENT_TIMESTAMP ELSE NULL END,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("studentId", "wordId") DO UPDATE SET
      "status" = EXCLUDED."status",
      "lastExploredAt" = CURRENT_TIMESTAMP,
      "masteredAt" = CASE WHEN EXCLUDED."status" = 'MASTERED' THEN CURRENT_TIMESTAMP ELSE NULL END,
      "updatedAt" = CURRENT_TIMESTAMP`,
    progId,
    params.studentId,
    params.wordId,
    params.status
  );
}

export async function removeStudentSavedWordInDb(params: {
  studentId: string;
  wordId: string;
}): Promise<void> {
  await ensureWordWiseTablesAndContent();
  await db.$executeRawUnsafe(
    `DELETE FROM "StudentSavedWord" WHERE "studentId" = $1 AND "wordId" = $2`,
    params.studentId,
    params.wordId
  );
}

export async function createPersonalVocabularyListInDb(params: {
  studentId: string;
  name: string;
  description: string;
}): Promise<void> {
  await ensureWordWiseTablesAndContent();
  const listId = `ww-list-${randomUUID()}`;
  await db.$executeRawUnsafe(
    `INSERT INTO "VocabularyPersonalList" ("id", "studentId", "name", "description", "updatedAt")
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT ("studentId", "name") DO UPDATE SET
       "description" = EXCLUDED."description",
       "updatedAt" = CURRENT_TIMESTAMP`,
    listId,
    params.studentId,
    params.name,
    params.description
  );
}

export async function deletePersonalVocabularyListInDb(params: {
  studentId: string;
  listId: string;
}): Promise<void> {
  await ensureWordWiseTablesAndContent();
  await db.$executeRawUnsafe(
    `DELETE FROM "VocabularyPersonalList" WHERE "id" = $1 AND "studentId" = $2`,
    params.listId,
    params.studentId
  );
}

export async function toggleWordInPersonalListInDb(params: {
  studentId: string;
  listId: string;
  wordId: string;
}): Promise<boolean> {
  await ensureWordWiseTablesAndContent();
  const owned = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "VocabularyPersonalList" WHERE "id" = $1 AND "studentId" = $2 LIMIT 1`,
    params.listId,
    params.studentId
  );
  if (owned.length === 0) return false;

  const existing = await db.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT "id" FROM "VocabularyPersonalListWord" WHERE "listId" = $1 AND "wordId" = $2 LIMIT 1`,
    params.listId,
    params.wordId
  );

  if (existing.length > 0) {
    await db.$executeRawUnsafe(
      `DELETE FROM "VocabularyPersonalListWord" WHERE "id" = $1`,
      existing[0]!.id
    );
  } else {
    await db.$executeRawUnsafe(
      `INSERT INTO "VocabularyPersonalListWord" ("id", "listId", "wordId")
       VALUES ($1, $2, $3)
       ON CONFLICT ("listId", "wordId") DO NOTHING`,
      `ww-lw-${randomUUID()}`,
      params.listId,
      params.wordId
    );
  }
  return true;
}

export async function recordQuizAttemptInDb(params: {
  studentId: string;
  exerciseType: string;
  difficulty: string;
  categorySlug: string | null;
  totalQuestions: number;
  correctAnswers: number;
  accuracyPct: number;
  feedbackItems: PracticeFeedbackItem[];
}): Promise<{ id: string; completedAt: string }> {
  await ensureWordWiseTablesAndContent();
  const attemptId = `ww-att-${randomUUID()}`;
  const nowIso = new Date().toISOString();

  await db.$executeRawUnsafe(
    `INSERT INTO "VocabularyQuizAttempt" (
      "id", "studentId", "exerciseType", "difficulty", "categorySlug",
      "totalQuestions", "correctAnswers", "accuracyPct", "details", "completedAt"
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, CURRENT_TIMESTAMP)`,
    attemptId,
    params.studentId,
    params.exerciseType,
    params.difficulty,
    params.categorySlug,
    params.totalQuestions,
    params.correctAnswers,
    params.accuracyPct,
    JSON.stringify({ feedbackItems: params.feedbackItems })
  );

  for (const item of params.feedbackItems) {
    if (!item.wordId) continue;
    const progId = `ww-prog-${randomUUID()}`;
    const incCorrect = item.isCorrect ? 1 : 0;
    await db.$executeRawUnsafe(
      `INSERT INTO "StudentVocabularyProgress" (
        "id", "studentId", "wordId", "status", "exploredCount", "practiceCount", "correctCount", "lastExploredAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, 'EXPLORED', 1, 1, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("studentId", "wordId") DO UPDATE SET
        "practiceCount" = "StudentVocabularyProgress"."practiceCount" + 1,
        "correctCount" = "StudentVocabularyProgress"."correctCount" + $4,
        "status" = CASE
          WHEN "StudentVocabularyProgress"."status" = 'MASTERED' THEN 'MASTERED'
          WHEN ("StudentVocabularyProgress"."correctCount" + $4) >= 2 THEN 'MASTERED'
          ELSE "StudentVocabularyProgress"."status"
        END,
        "masteredAt" = CASE
          WHEN ("StudentVocabularyProgress"."correctCount" + $4) >= 2 AND "StudentVocabularyProgress"."masteredAt" IS NULL THEN CURRENT_TIMESTAMP
          ELSE "StudentVocabularyProgress"."masteredAt"
        END,
        "lastExploredAt" = CURRENT_TIMESTAMP,
        "updatedAt" = CURRENT_TIMESTAMP`,
      progId,
      params.studentId,
      item.wordId,
      incCorrect
    );
  }

  return { id: attemptId, completedAt: nowIso };
}

export async function loadWordWisePayloadForStudent(params: {
  studentId: string;
  studentName: string;
  programCode: string;
  programName: string;
}): Promise<WordWiseInitialPayload> {
  const todayDateKey = getTodayDateKey();
  const [{ categories, words }, studentState] = await Promise.all([
    loadAllVocabularyWordsFromDb(),
    loadStudentWordWiseState(params.studentId),
  ]);

  const wordOfTheDay = getDeterministicWordOfTheDay(words, todayDateKey);
  const progressSummary = buildWordWiseProgressSummary({
    categories,
    words,
    savedWords: studentState.savedWords,
    wordProgress: studentState.wordProgress,
    quizAttempts: studentState.quizAttempts,
    todayDateKey,
  });

  return {
    studentName: params.studentName,
    programCode: params.programCode,
    programName: params.programName,
    todayDateKey,
    categories,
    words,
    wordOfTheDay,
    comparisons: [...FORMAL_INFORMAL_COMPARISONS],
    savedWords: studentState.savedWords,
    wordProgress: studentState.wordProgress,
    personalLists: studentState.personalLists,
    quizAttempts: studentState.quizAttempts,
    progressSummary,
  };
}
