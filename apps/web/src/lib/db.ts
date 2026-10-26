import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { Pool, type PoolConfig } from "pg";
import { createHash } from "node:crypto";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
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
    const target = new URL(connectionString);
    const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
    // Remote database connections must verify the certificate and hostname, including URLs without sslmode.
    if (!isLocalhost) {
      target.searchParams.delete("uselibpqcompat");
      target.searchParams.set("sslmode", "verify-full");
    }
    const isProduction = process.env.NODE_ENV === "production";
    const configuredMax = process.env.DATABASE_POOL_MAX;
    if (configuredMax !== undefined && !/^(?:[1-9]|1[0-9]|20)$/.test(configuredMax)) {
      throw new Error("DATABASE_POOL_MAX must be an integer from 1 to 20; size it against the provider connection budget.");
    }

    const poolConfig: PoolConfig = {
      connectionString: target.toString(),
      // In serverless production (e.g. Vercel), limit connections per lambda to prevent pool exhaustion.
      // In local dev, allow up to 15 connections with longer idle timeout so pooled connections stay warm.
      max: configuredMax === undefined ? (isProduction ? 2 : 15) : Number(configuredMax),
      idleTimeoutMillis: isProduction ? 30000 : 120000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      // pg parses sslrootcert from the URL when a private certificate authority is required.
      ssl: !isLocalhost ? { rejectUnauthorized: true } : undefined,
    };

    globalForPrisma.pgPool = new Pool(poolConfig);

    // Handle unexpected idle connection resets gracefully (common with serverless poolers)
    globalForPrisma.pgPool.on("error", (err) => {
      console.warn("PG Pool idle connection notice:", err.message);
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pgPool);
  return new PrismaClient<Prisma.PrismaClientOptions>({
    omit: { syllabusItem: { workHistoryState: true }, studentSubmission: { workHistoryState: true } },
    adapter,
    // ORM errors can include credential-bearing query arguments; callers report sanitized errors.
    log: process.env.NODE_ENV === "development" ? ["warn"] : [],
  });
};

// Next.js retains globals across hot reloads, including clients generated for an older schema.
const schemaVersion = createHash("sha256")
  .update(JSON.stringify(Prisma.dmmf.datamodel) + "lab-provenance-omit-v1")
  .digest("hex");
const previous = globalForPrisma.prisma;
export const db = previous && globalForPrisma.prismaSchemaVersion === schemaVersion
  ? previous
  : createPrismaClient();

// Always cache client on globalThis in all environments so warm serverless lambdas reuse the instance
globalForPrisma.prisma = db;
globalForPrisma.prismaSchemaVersion = schemaVersion;
if (previous && previous !== db) void previous.$disconnect().catch(() => {});

