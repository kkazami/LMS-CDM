import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isWordWiseEligible } from "../../apps/web/src/lib/wordwise/eligibility";
import {
  FORMAL_INFORMAL_COMPARISONS,
  SEED_VOCABULARY_WORDS,
  WORDWISE_CATEGORIES,
  buildInMemoryVocabularyWords,
  getDeterministicWordOfTheDay,
} from "../../apps/web/src/lib/wordwise/content-bank";
import {
  generatePracticeQuestions,
  gradePracticeAttempt,
} from "../../apps/web/src/lib/wordwise/practice-engine";
import {
  WRITING_IMPROVEMENT_DISCLAIMER,
  analyzeAcademicWriting,
} from "../../apps/web/src/lib/wordwise/writing-helper";
import {
  buildWordWiseProgressSummary,
  computeLearningStreak,
} from "../../apps/web/src/lib/wordwise/progress";
import {
  lookupGeneralEnglishWord,
  searchExtendedGeneralLexicon,
} from "../../apps/web/src/lib/wordwise/general-dictionary";
import { rankAndFilterVocabularyWords } from "../../apps/web/src/lib/wordwise/search-ranking";

describe("IBE WordWise – Vocabulary & Academic Language Hub", () => {
  it("authorizes only active IBE students enrolled in BSBA HRM", () => {
    assert.equal(
      isWordWiseEligible({
        role: "STUDENT",
        status: "ACTIVE",
        instituteCode: "IBE",
        programCode: "BSBA HRM",
      }),
      true
    );

    // Denies BS ENTREP students
    assert.equal(
      isWordWiseEligible({
        role: "STUDENT",
        status: "ACTIVE",
        instituteCode: "IBE",
        programCode: "BS ENTREP",
      }),
      false
    );

    // Denies unassigned program
    assert.equal(
      isWordWiseEligible({
        role: "STUDENT",
        status: "ACTIVE",
        instituteCode: "IBE",
        programCode: null,
      }),
      false
    );

    // Denies ICS / ITE students and non-student roles
    assert.equal(
      isWordWiseEligible({
        role: "STUDENT",
        status: "ACTIVE",
        instituteCode: "ICS",
        programCode: "BSBA HRM",
      }),
      false
    );
    assert.equal(
      isWordWiseEligible({
        role: "PROFESSOR",
        status: "ACTIVE",
        instituteCode: "IBE",
        programCode: "BSBA HRM",
      }),
      false
    );
    assert.equal(
      isWordWiseEligible({
        role: "ADMIN",
        status: "ACTIVE",
        instituteCode: "IBE",
        programCode: "BSBA HRM",
      }),
      false
    );
  });

  it("includes all 6 general student academic & formal vocabulary categories and complete word records", () => {
    assert.equal(WORDWISE_CATEGORIES.length, 6);
    const categoryNames = WORDWISE_CATEGORIES.map((c) => c.name);
    assert.deepEqual(categoryNames, [
      "Academic Writing & Research",
      "Formal Replacements",
      "Transition & Connecting Words",
      "Analytical & Descriptive",
      "Critical Reading & Argumentation",
      "Formal & Classroom Communication",
    ]);

    assert.ok(SEED_VOCABULARY_WORDS.length >= 150);
    for (const word of SEED_VOCABULARY_WORDS) {
      assert.ok(word.word.length > 0);
      assert.ok(word.pronunciation.length > 0);
      assert.ok(word.simpleDefinition.length > 10);
      assert.ok(word.formalDefinition.length > 10);
      assert.ok(word.usageContext.length > 10);
      assert.ok(word.synonyms.length >= 2);
      assert.ok(word.antonyms.length >= 1);
      assert.ok(word.examples.length >= 2);
    }

    // Verify Formal vs. Informal comparisons include the 7 required expressions
    const requiredInformal = [
      "Find out",
      "A lot of",
      "Get better",
      "Talk about",
      "Show",
      "Help",
      "Make sure",
    ];
    for (const expr of requiredInformal) {
      assert.ok(
        FORMAL_INFORMAL_COMPARISONS.some(
          (cmp) => cmp.informalExpression === expr
        ),
        `Missing required comparison for "${expr}"`
      );
    }
  });

  it("selects Word of the Day deterministically by calendar date", () => {
    const words = buildInMemoryVocabularyWords();
    const reversed = [...words].reverse();

    const pickA = getDeterministicWordOfTheDay(words, "2026-11-08");
    const pickB = getDeterministicWordOfTheDay(reversed, "2026-11-08");
    assert.equal(pickA.id, pickB.id);
    assert.equal(pickA.word, pickB.word);
  });

  it("generates and grades all 5 practice exercise types across difficulty levels", () => {
    const words = buildInMemoryVocabularyWords();
    const types = [
      "MULTIPLE_CHOICE",
      "WORD_MATCHING",
      "FILL_IN_BLANKS",
      "FORMAL_REPLACEMENT",
      "SENTENCE_CONSTRUCTION",
    ] as const;

    for (const exerciseType of types) {
      const questions = generatePracticeQuestions({
        words,
        exerciseType,
        difficulty: "INTERMEDIATE",
        categorySlug: "ALL",
        questionCount: 5,
        seed: "test-seed-123",
      });

      assert.equal(questions.length, 5);
      for (const q of questions) {
        assert.equal(q.exerciseType, exerciseType);
        assert.ok(q.targetWord.length > 0);
        assert.ok(q.pronunciation.length > 0);
        assert.ok(q.options.includes(q.correctAnswer));
      }

      const perfectAnswers: Record<string, string> = {};
      for (const q of questions) {
        perfectAnswers[q.id] = q.correctAnswer;
      }

      const graded = gradePracticeAttempt({
        questions,
        answers: perfectAnswers,
      });
      assert.equal(graded.totalQuestions, 5);
      assert.equal(graded.correctAnswers, 5);
      assert.equal(graded.accuracyPct, 100);
    }
  });

  it("highlights informal expressions and provides rule-based formal replacements without AI", () => {
    const input =
      "HR needs to find out why overtime increased and make sure supervisors talk about the new policy with a lot of staff.";
    const result = analyzeAcademicWriting(input);

    assert.equal(result.disclaimer, WRITING_IMPROVEMENT_DISCLAIMER);
    assert.equal(result.suggestions.length, 4);
    assert.ok(result.improvedText.includes("determine"));
    assert.ok(result.improvedText.includes("ensure"));
    assert.ok(result.improvedText.includes("discuss"));
    assert.ok(result.improvedText.includes("numerous"));
  });

  it("calculates student progress metrics strictly from actual student records", () => {
    const words = buildInMemoryVocabularyWords();
    const categories = WORDWISE_CATEGORIES.map((c) => ({
      ...c,
      wordCount: words.filter((w) => w.categorySlug === c.slug).length,
    }));

    // Empty state must be all zeros
    const emptySummary = buildWordWiseProgressSummary({
      categories,
      words,
      savedWords: [],
      wordProgress: [],
      quizAttempts: [],
      todayDateKey: "2026-11-08",
    });

    assert.equal(emptySummary.wordsExplored, 0);
    assert.equal(emptySummary.wordsSaved, 0);
    assert.equal(emptySummary.wordsMastered, 0);
    assert.equal(emptySummary.practiceActivitiesCompleted, 0);
    assert.equal(emptySummary.averagePracticeAccuracy, 0);
    assert.equal(emptySummary.learningStreak, 0);

    // Populated state reflects exact student records
    const w1 = words[0]!;
    const w2 = words[1]!;
    const activeSummary = buildWordWiseProgressSummary({
      categories,
      words,
      savedWords: [
        {
          id: "sv-1",
          wordId: w1.id,
          status: "MASTERED",
          notes: "Used in HRM paper",
          createdAt: "2026-11-07T10:00:00.000Z",
          updatedAt: "2026-11-08T10:00:00.000Z",
        },
      ],
      wordProgress: [
        {
          wordId: w1.id,
          status: "MASTERED",
          exploredCount: 3,
          practiceCount: 2,
          correctCount: 2,
          lastExploredAt: "2026-11-08T10:00:00.000Z",
          masteredAt: "2026-11-08T10:00:00.000Z",
        },
        {
          wordId: w2.id,
          status: "LEARNING",
          exploredCount: 1,
          practiceCount: 1,
          correctCount: 0,
          lastExploredAt: "2026-11-07T09:00:00.000Z",
          masteredAt: null,
        },
      ],
      quizAttempts: [
        {
          id: "qa-1",
          exerciseType: "MULTIPLE_CHOICE",
          difficulty: "INTERMEDIATE",
          categorySlug: null,
          totalQuestions: 5,
          correctAnswers: 4,
          accuracyPct: 80,
          completedAt: "2026-11-08T11:00:00.000Z",
          feedbackItems: [],
        },
      ],
      todayDateKey: "2026-11-08",
    });

    assert.equal(activeSummary.wordsExplored, 2);
    assert.equal(activeSummary.wordsSaved, 1);
    assert.equal(activeSummary.wordsMastered, 1);
    assert.equal(activeSummary.wordsLearning, 1);
    assert.equal(activeSummary.practiceActivitiesCompleted, 1);
    assert.equal(activeSummary.averagePracticeAccuracy, 80);
    assert.equal(activeSummary.learningStreak, 2);

    assert.equal(
      computeLearningStreak(
        [
          "2026-11-06T08:00:00.000Z",
          "2026-11-07T08:00:00.000Z",
          "2026-11-08T08:00:00.000Z",
        ],
        "2026-11-08"
      ),
      3
    );
  });

  it("supports general English dictionary searches across the extended lexicon and live dictionary lookup", async () => {
    const extendedMatches = searchExtendedGeneralLexicon("serendipity");
    assert.ok(extendedMatches.length >= 1);
    assert.equal(extendedMatches[0]?.word, "Serendipity");

    const lookedUp = await lookupGeneralEnglishWord("eloquent");
    assert.ok(lookedUp !== null);
    assert.equal(lookedUp.word.toLowerCase(), "eloquent");
    assert.ok(lookedUp.simpleDefinition.length > 5);
    assert.ok(lookedUp.examples.length >= 1);
  });

  it("prioritizes prefix matches and progressive letter correspondence in dictionary search", () => {
    const catalog = [
      ...buildInMemoryVocabularyWords(),
      ...searchExtendedGeneralLexicon(""),
    ];
    assert.ok(catalog.length >= 150, `Expected at least 150 curated words, got ${catalog.length}`);

    // Single letter "a": ALL returned entries must start with "A"
    const resultsA = rankAndFilterVocabularyWords(catalog, "a");
    assert.ok(resultsA.length >= 10, "Expected words starting with A");
    for (const w of resultsA) {
      assert.ok(
        w.word.toLowerCase().startsWith("a"),
        `Expected word "${w.word}" to start with "a"`
      );
    }
    // Verify alphabetical sorting
    for (let i = 1; i < Math.min(20, resultsA.length); i++) {
      assert.ok(
        resultsA[i - 1]!.word.localeCompare(resultsA[i]!.word) <= 0,
        `Expected ${resultsA[i - 1]!.word} <= ${resultsA[i]!.word}`
      );
    }

    // Single letter "c": ALL returned entries must start with "C"
    const resultsC = rankAndFilterVocabularyWords(catalog, "c");
    assert.ok(resultsC.length >= 15, "Expected words starting with C");
    for (const w of resultsC) {
      assert.ok(
        w.word.toLowerCase().startsWith("c"),
        `Expected word "${w.word}" to start with "c"`
      );
    }

    // Progressive typing: "co" should return words starting with "co" first
    const resultsCo = rankAndFilterVocabularyWords(catalog, "co");
    assert.ok(resultsCo.length >= 5);
    const topWordsCo = resultsCo.slice(0, 5).map((w) => w.word.toLowerCase());
    for (const word of topWordsCo) {
      assert.ok(
        word.startsWith("co"),
        `Expected top result "${word}" to start with "co"`
      );
    }

    // Exact match: "corroborate" should rank #1
    const resultsCorroborate = rankAndFilterVocabularyWords(catalog, "corroborate");
    assert.ok(resultsCorroborate.length >= 1);
    assert.equal(resultsCorroborate[0]?.word.toLowerCase(), "corroborate");

    // Prefix match: "substantiat" should return "substantiate" as top result
    const resultsSubstant = rankAndFilterVocabularyWords(catalog, "substantiat");
    assert.ok(resultsSubstant.length >= 1);
    assert.equal(resultsSubstant[0]?.word.toLowerCase(), "substantiate");

    // Headword dominance: "hierar" must ONLY return Hierarchical and Hierarchy, NEVER Taxonomy
    const resultsHierar = rankAndFilterVocabularyWords(catalog, "hierar");
    const wordsHierar = resultsHierar.map((w) => w.word);
    assert.deepEqual(wordsHierar, ["Hierarchical", "Hierarchy"]);
    assert.ok(!wordsHierar.includes("Taxonomy"), "Taxonomy must NOT be included when searching 'hierar'");

    // Typo normalization: "heirar" (with "ei") must also return Hierarchical and Hierarchy without Taxonomy
    const resultsHeirar = rankAndFilterVocabularyWords(catalog, "heirar");
    const wordsHeirar = resultsHeirar.map((w) => w.word);
    assert.deepEqual(wordsHeirar, ["Hierarchical", "Hierarchy"]);
    assert.ok(!wordsHeirar.includes("Taxonomy"), "Taxonomy must NOT be included when searching 'heirar'");
  });
});

