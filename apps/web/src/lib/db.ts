import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool, type PoolConfig } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const createPrismaClient = () => {
  // Support standard DATABASE_URL as well as Vercel Postgres / Neon integration variables
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error(
      "[Database Error] No database connection string found. Please set DATABASE_URL (or POSTGRES_PRISMA_URL / POSTGRES_URL) in your environment variables (e.g. in Vercel Project Settings > Environment Variables)."
    );
  }

  if (!globalForPrisma.pgPool) {
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalhost =
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1") ||
      connectionString.includes("::1");

    const poolConfig: PoolConfig = {
      connectionString,
      // In serverless production (e.g. Vercel), limit connections per lambda to prevent pool exhaustion
      max: isProduction ? 2 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      keepAlive: true,
      // Cloud databases (Supabase, Neon, AWS RDS, Railway, Render) require SSL.
      // rejectUnauthorized: false prevents "self-signed certificate in certificate chain" errors
      ssl: !isLocalhost ? { rejectUnauthorized: false } : undefined,
    };

    globalForPrisma.pgPool = new Pool(poolConfig);

    // Handle unexpected idle connection resets gracefully (common with serverless poolers)
    globalForPrisma.pgPool.on("error", (err) => {
      console.warn("PG Pool idle connection notice:", err.message);
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pgPool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

// Always cache client on globalThis in all environments so warm serverless lambdas reuse the instance
globalForPrisma.prisma = db;

