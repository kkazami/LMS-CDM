import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient();
}

function hasWorkspaceModels(client: PrismaClient) {
  const runtimeClient = client as PrismaClient & Record<string, unknown>;

  return ["note", "taskItem", "calendarEvent"].every((delegate) => delegate in runtimeClient);
}

export const db =
  globalForPrisma.prisma && hasWorkspaceModels(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}