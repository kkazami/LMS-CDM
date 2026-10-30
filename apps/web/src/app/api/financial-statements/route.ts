import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { denied, ensureFinancialStatementTable, requireFinancialStudent, sameOriginViolation } from "@/lib/financial-statements/access";
import { createStatementSchema } from "@/lib/financial-statements/schemas";
import {
  MAX_STATEMENTS_PER_STUDENT,
  computeResults,
  persistedColumns,
  toJson,
  toSummary,
} from "@/lib/financial-statements/server";
import { createDefaultData } from "@/lib/financial-statements/templates";
import { isStatementType } from "@/lib/financial-statements/types";

export const dynamic = "force-dynamic";

/** GET /api/financial-statements — the signed-in student's own statements (no data payload). */
export async function GET(request: Request) {
  try {
    const access = await requireFinancialStudent(request);
    if (!access.ok) return denied(access);

    await ensureFinancialStatementTable().catch(() => {});
    const rows = await db.financialStatement.findMany({
      where: { studentId: access.userId },
      orderBy: { updatedAt: "desc" },
      take: MAX_STATEMENTS_PER_STUDENT,
    });
    return NextResponse.json({
      statements: rows.filter((row) => isStatementType(row.statementType)).map(toSummary),
    });
  } catch (error) {
    console.error("GET_FINANCIAL_STATEMENTS_ERROR", error);
    return NextResponse.json({ message: "Failed to load statements." }, { status: 500 });
  }
}

/** POST /api/financial-statements — start a new student-owned draft from a template. */
export async function POST(request: Request) {
  try {
    const blocked = sameOriginViolation(request);
    if (blocked) return blocked;
    const access = await requireFinancialStudent(request);
    if (!access.ok) return denied(access);

    const body = createStatementSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ message: "Choose a valid statement template." }, { status: 400 });
    }

    await ensureFinancialStatementTable().catch(() => {});
    const existing = await db.financialStatement.count({ where: { studentId: access.userId } });
    if (existing >= MAX_STATEMENTS_PER_STUDENT) {
      return NextResponse.json(
        { message: `You have reached the limit of ${MAX_STATEMENTS_PER_STUDENT} statements. Delete some to create more.` },
        { status: 409 },
      );
    }

    const type = body.data.statementType;
    const data = createDefaultData(type);
    const created = await db.financialStatement.create({
      data: {
        studentId: access.userId,
        instituteId: access.instituteId,
        statementType: type,
        status: "DRAFT",
        ...persistedColumns(type, data),
        data: toJson(data),
        results: toJson(computeResults(type, data)),
      },
    });
    return NextResponse.json({ statement: toSummary(created) }, { status: 201 });
  } catch (error) {
    console.error("POST_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to create the statement." }, { status: 500 });
  }
}
