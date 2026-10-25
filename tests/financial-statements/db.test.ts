import assert from "node:assert/strict";
import { test } from "node:test";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

test("Prisma FinancialStatement CRUD against database", async (t) => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    t.skip("DATABASE_URL not set");
    return;
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Find an IBE institute and an active user
    const institute = await prisma.institute.findFirst({
      where: { code: { in: ["ibe", "IBE"] } },
    });
    const user = await prisma.user.findFirst({
      where: {
        ...(institute ? { instituteId: institute.id } : {}),
      },
    });

    if (!institute || !user) {
      console.log("No test institute/user found, skipping DB integration assertions");
      return;
    }

    // 2. Count existing
    const countBefore = await prisma.financialStatement.count({
      where: { studentId: user.id },
    });
    assert.strictEqual(typeof countBefore, "number");

    // 3. Create a test statement draft
    const created = await prisma.financialStatement.create({
      data: {
        studentId: user.id,
        instituteId: institute.id,
        statementType: "INCOME_STATEMENT",
        status: "DRAFT",
        businessName: "Test Company Inc.",
        data: {
          meta: {
            businessName: "Test Company Inc.",
            periodStart: "2026-01-01",
            periodEnd: "2026-12-31",
            asOfDate: "",
            notes: "",
          },
          sections: {},
        },
      },
    });

    assert.ok(created.id);
    assert.strictEqual(created.status, "DRAFT");
    assert.strictEqual(created.businessName, "Test Company Inc.");

    // 4. Read back
    const fetched = await prisma.financialStatement.findUnique({
      where: { id: created.id },
    });
    assert.ok(fetched);
    assert.strictEqual(fetched.id, created.id);

    // 5. Update
    const updated = await prisma.financialStatement.update({
      where: { id: created.id },
      data: {
        businessName: "Test Company Updated",
      },
    });
    assert.strictEqual(updated.businessName, "Test Company Updated");

    // 6. Delete
    await prisma.financialStatement.delete({
      where: { id: created.id },
    });

    const deleted = await prisma.financialStatement.findUnique({
      where: { id: created.id },
    });
    assert.strictEqual(deleted, null);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
});
