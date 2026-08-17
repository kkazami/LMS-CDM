import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function hasWorkspaceModels(client: PrismaClient) {
  const runtimeClient = client as PrismaClient & Record<string, unknown>;

  return ["note", "taskItem", "calendarEvent", "notification"].every((delegate) => delegate in runtimeClient);
}

export const db =
  globalForPrisma.prisma && hasWorkspaceModels(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}