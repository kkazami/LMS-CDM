import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  loadOwnedStatement,
  requireFinancialStudent,
  sameOriginViolation,
} from "@/lib/financial-statements/access";
import { normalizeData } from "@/lib/financial-statements/data";
import {
  MAX_STATEMENTS_PER_STUDENT,
  computeResults,
  persistedColumns,
  toJson,
  toSummary,
} from "@/lib/financial-statements/server";
import { isStatementType } from "@/lib/financial-statements/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/financial-statements/[id]/duplicate — copies the student's own statement as a new draft. */
export async function POST(request: Request, { params }: Ctx) {
  try {
    const blocked = sameOriginViolation(request);
    if (blocked) return blocked;
    const access = await requireFinancialStudent(request);
    if (!access.ok) return denied(access);
    const { id } = await params;
    const row = await loadOwnedStatement(id, access.userId);
    if (!row || !isStatementType(row.statementType)) {
      return NextResponse.json({ message: "Statement not found." }, { status: 404 });
    }

    const count = await db.financialStatement.count({ where: { studentId: access.userId } });
    if (count >= MAX_STATEMENTS_PER_STUDENT) {
      return NextResponse.json({ message: "You have reached the statement limit. Delete some to continue." }, { status: 409 });
    }

    const type = row.statementType;
    const data = normalizeData(type, row.data);
    const copy = await db.financialStatement.create({
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
    return NextResponse.json({ statement: toSummary(copy) }, { status: 201 });
  } catch (error) {
    console.error("DUPLICATE_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to duplicate the statement." }, { status: 500 });
  }
}
