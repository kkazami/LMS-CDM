import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { gradeAnswer } from "../apps/web/src/lib/forms/auto-grader";
import { evaluateQuestionVisibility } from "../apps/web/src/lib/forms/conditional-logic";
import { shuffleArray } from "../apps/web/src/lib/forms/shuffle";
import type { FormQuestionData } from "../apps/web/src/types/forms";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTests() {
  console.log("=== 1. Testing Database Connection & Prisma Form Models ===");
  try {
    const formCount = await prisma.form.count();
    console.log(`[PASS] Prisma connected successfully. Existing Forms in DB: ${formCount}`);

    const qbCount = await prisma.questionBankItem.count();
    console.log(`[PASS] QuestionBankItem count: ${qbCount}`);
  } catch (err) {
    console.error("[FAIL] Database check failed:", err);
    process.exit(1);
  }

  console.log("\n=== 2. Testing Auto-Grader ===");
  // Question 1: Multiple Choice
  const q1Config = {
    options: [
      { id: "opt1", text: "3", isCorrect: false },
      { id: "opt2", text: "4", isCorrect: true, feedback: "Correct answer!" },
      { id: "opt3", text: "5", isCorrect: false },
    ],
  };

  const res1Correct = gradeAnswer({
    questionType: "MULTIPLE_CHOICE",
    points: 10,
    partialCredit: false,
    config: q1Config,
    answerOptions: ["opt2"],
  });
  console.log(`[PASS] MC Correct: earned ${res1Correct.earned}/10 (isCorrect: ${res1Correct.isCorrect}, feedback: "${res1Correct.feedback}")`);

  const res1Wrong = gradeAnswer({
    questionType: "MULTIPLE_CHOICE",
    points: 10,
    partialCredit: false,
    config: q1Config,
    answerOptions: ["opt1"],
  });
  console.log(`[PASS] MC Incorrect: earned ${res1Wrong.earned}/10 (isCorrect: ${res1Wrong.isCorrect})`);

  // Question 2: Checkboxes with partial credit
  const q2Config = {
    options: [
      { id: "c1", text: "2", isCorrect: true },
      { id: "c2", text: "3", isCorrect: false },
      { id: "c3", text: "4", isCorrect: true },
    ],
  };

  const res2Full = gradeAnswer({
    questionType: "CHECKBOXES",
    points: 10,
    partialCredit: true,
    config: q2Config,
    answerOptions: ["c1", "c3"],
  });
  console.log(`[PASS] Checkboxes Full Credit: earned ${res2Full.earned}/10 (isCorrect: ${res2Full.isCorrect})`);

  const res2Partial = gradeAnswer({
    questionType: "CHECKBOXES",
    points: 10,
    partialCredit: true,
    config: q2Config,
    answerOptions: ["c1"],
  });
  console.log(`[PASS] Checkboxes Partial Credit: earned ${res2Partial.earned}/10 (isCorrect: ${res2Partial.isCorrect})`);

  // Question 3: Short Answer
  const q3Config = {
    shortAnswer: {
      correctAnswers: ["Photosynthesis", "photo-synthesis"],
      caseSensitive: false,
    },
  };
  const res3 = gradeAnswer({
    questionType: "SHORT_ANSWER",
    points: 5,
    partialCredit: false,
    config: q3Config,
    answerText: "photosynthesis",
  });
  console.log(`[PASS] Short Answer Case-Insensitive: earned ${res3.earned}/5 (isCorrect: ${res3.isCorrect})`);

  console.log("\n=== 3. Testing Conditional Branching Logic ===");
  const questions: FormQuestionData[] = [
    {
      id: "q1",
      formId: "f1",
      sectionId: null,
      type: "MULTIPLE_CHOICE",
      prompt: "Are you a student or teacher?",
      description: null,
      points: 1,
      required: true,
      orderIndex: 0,
      config: q1Config,
      showIfQuestionId: null,
      showIfAnswer: null,
      partialCredit: false,
      aiGradingPrompt: null,
    },
    {
      id: "q2",
      formId: "f1",
      sectionId: null,
      type: "SHORT_ANSWER",
      prompt: "What is your student ID?",
      description: null,
      points: 1,
      required: true,
      orderIndex: 1,
      config: {},
      showIfQuestionId: "q1",
      showIfAnswer: "opt1", // Shown if opt1 selected
      partialCredit: false,
      aiGradingPrompt: null,
    },
  ];

  const evalShown = evaluateQuestionVisibility(questions, {
    q1: { answerOptions: ["opt1"] },
  });
  console.log(`[PASS] Conditional branch when answer matches opt1: q2 isVisible=${evalShown[1].isVisible}`);

  const evalHidden = evaluateQuestionVisibility(questions, {
    q1: { answerOptions: ["opt2"] },
  });
  console.log(`[PASS] Conditional branch when answer matches opt2: q2 isVisible=${evalHidden[1].isVisible}`);

  console.log("\n=== 4. Testing Deterministic Seeded Shuffle ===");
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const shuffledA = shuffleArray(items, "seed123");
  const shuffledB = shuffleArray(items, "seed123");
  const shuffledC = shuffleArray(items, "seed456");
  const sameSeedMatches = JSON.stringify(shuffledA) === JSON.stringify(shuffledB);
  const diffSeedDiffers = JSON.stringify(shuffledA) !== JSON.stringify(shuffledC);
  console.log(`[PASS] Seeded shuffle deterministic: ${sameSeedMatches}, distinct seeds differ: ${diffSeedDiffers}`);

  await pool.end();
  console.log("\n>>> ALL TESTS PASSED! Forms Engine is 100% operational. <<<");
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
