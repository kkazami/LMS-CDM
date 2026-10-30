import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { Pool, type PoolConfig } from "pg";

import {
  PREDEFINED_QUESTIONS,
  PREDEFINED_SCENARIOS,
  PREDEFINED_QUIZ_QUESTIONS,
} from "../apps/web/src/lib/mock-interview/content-bank";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Error: DATABASE_URL is not set.");
  process.exit(1);
}

const isLocalhost =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1") ||
  connectionString.includes("::1");

const poolConfig: PoolConfig = {
  connectionString,
  ssl: !isLocalhost ? { rejectUnauthorized: false } : undefined,
};

import fs from "fs";
import path from "path";

function createStandaloneClients() {
  if (!connectionString) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
  }
  const pool = new Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

export async function seedMockInterviewContent(
  existingPrisma?: PrismaClient,
  existingPool?: Pool
) {
  const standalone = !existingPrisma || !existingPool ? createStandaloneClients() : null;
  const prisma = existingPrisma ?? standalone!.prisma;
  const pool = existingPool ?? standalone!.pool;

  try {
    console.log("Ensuring Mock Interview tables exist...");
    const migrationPath = path.join(__dirname, "migrations/20261027000000_mock_interview/migration.sql");
    if (fs.existsSync(migrationPath)) {
      const sql = fs.readFileSync(migrationPath, "utf-8");
      await pool.query(sql);
    }

    console.log("Seeding Mock Interview questions...");
    for (const q of PREDEFINED_QUESTIONS) {
      await prisma.mockInterviewQuestion.upsert({
        where: { id: q.id },
        update: {
          category: q.category,
          difficulty: q.difficulty,
          questionText: q.questionText,
          jobPosition: q.jobPosition,
          situation: q.situation,
          modelAnswer: q.modelAnswer,
          interviewTip: q.interviewTip,
          evaluationCriteria: q.evaluationCriteria,
          competency: q.competency,
        },
        create: {
          id: q.id,
          category: q.category,
          difficulty: q.difficulty,
          questionText: q.questionText,
          jobPosition: q.jobPosition,
          situation: q.situation,
          modelAnswer: q.modelAnswer,
          interviewTip: q.interviewTip,
          evaluationCriteria: q.evaluationCriteria,
          competency: q.competency,
        },
      });
    }

    console.log("Seeding Mock Interview recruiter scenarios...");
    for (const s of PREDEFINED_SCENARIOS) {
      await prisma.mockInterviewRecruiterScenario.upsert({
        where: { id: s.id },
        update: {
          title: s.title,
          category: s.category,
          roleOrPosition: s.roleOrPosition,
          context: s.context,
          questionOptions: s.questionOptions as any,
          applicantAnswers: s.applicantAnswers as any,
          followUpOptions: (s.followUpOptions || []) as any,
          practicalAdvice: s.practicalAdvice,
          competency: s.competency,
        },
        create: {
          id: s.id,
          title: s.title,
          category: s.category,
          roleOrPosition: s.roleOrPosition,
          context: s.context,
          questionOptions: s.questionOptions as any,
          applicantAnswers: s.applicantAnswers as any,
          followUpOptions: (s.followUpOptions || []) as any,
          practicalAdvice: s.practicalAdvice,
          competency: s.competency,
        },
      });
    }

    console.log("Seeding Mock Interview quiz questions...");
    for (const q of PREDEFINED_QUIZ_QUESTIONS) {
      await prisma.mockInterviewQuizQuestion.upsert({
        where: { id: q.id },
        update: {
          questionText: q.questionText,
          choices: q.choices as any,
          correctAnswer: q.correctAnswer ?? 0,
          explanation: q.explanation ?? "",
          category: q.category,
          difficulty: q.difficulty,
          pointValue: q.pointValue,
        },
        create: {
          id: q.id,
          questionText: q.questionText,
          choices: q.choices as any,
          correctAnswer: q.correctAnswer ?? 0,
          explanation: q.explanation ?? "",
          category: q.category,
          difficulty: q.difficulty,
          pointValue: q.pointValue,
        },
      });
    }

    console.log("Mock Interview content seeded successfully!");
  } finally {
    if (standalone) {
      await standalone.prisma.$disconnect();
      await standalone.pool.end();
    }
  }
}

async function main() {
  await seedMockInterviewContent();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
