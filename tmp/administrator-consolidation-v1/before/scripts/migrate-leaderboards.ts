import { Pool, type PoolConfig } from "pg";
import "dotenv/config";

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
  connectionTimeoutMillis: 15000,
};

const pool = new Pool(poolConfig);

async function migrate() {
  console.log("Connecting to PostgreSQL to apply Leaderboard schema updates...");
  const client = await pool.connect();

  try {
    await client.query("BEGIN;");

    // 1. Add leaderboardEnabled to SyllabusItem if missing
    await client.query(`
      ALTER TABLE "SyllabusItem" 
      ADD COLUMN IF NOT EXISTS "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log("Applied SyllabusItem.leaderboardEnabled column.");

    // 2. Add rewardDescription to GradeIncentiveRule if missing
    await client.query(`
      ALTER TABLE "GradeIncentiveRule" 
      ADD COLUMN IF NOT EXISTS "rewardDescription" TEXT NOT NULL DEFAULT '';
    `);
    console.log("Applied GradeIncentiveRule.rewardDescription column.");

    // 3. Create LeaderboardReward Table if missing
    await client.query(`
      CREATE TABLE IF NOT EXISTS "LeaderboardReward" (
        "id" TEXT NOT NULL,
        "syllabusItemId" TEXT NOT NULL,
        "placement" INTEGER NOT NULL,
        "rewardLabel" TEXT NOT NULL,
        "bonusExp" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "LeaderboardReward_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log("Ensured LeaderboardReward table exists.");

    // 4. Create Index on LeaderboardReward(syllabusItemId)
    await client.query(`
      CREATE INDEX IF NOT EXISTS "LeaderboardReward_syllabusItemId_idx" 
      ON "LeaderboardReward"("syllabusItemId");
    `);

    // 5. Add foreign key from LeaderboardReward to SyllabusItem
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeaderboardReward_syllabusItemId_fkey') THEN
          ALTER TABLE "LeaderboardReward" 
          ADD CONSTRAINT "LeaderboardReward_syllabusItemId_fkey" 
          FOREIGN KEY ("syllabusItemId") REFERENCES "SyllabusItem"("id") 
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    console.log("Ensured LeaderboardReward foreign key constraint exists.");

    await client.query("COMMIT;");
    console.log("SUCCESS! All Leaderboard schema updates applied successfully.");
  } catch (error) {
    await client.query("ROLLBACK;");
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
