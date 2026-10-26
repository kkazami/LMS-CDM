import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  loadOwnedStatement,
  requireFinancialStudent,
  sameOriginViolation,
} from "@/lib/financial-statements/access";
import { normalizeData } from "@/lib/financial-statements/data";
import { computeResults, persistedColumns, toDetail, toJson } from "@/lib/financial-statements/server";
import { createDefaultData } from "@/lib/financial-statements/templates";
import { isStatementType } from "@/lib/financial-statements/types";
import { validateStatement } from "@/lib/financial-statements/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/financial-statements/[id]/reset
 * Restores this statement's rows to the template defaults (all entered amounts
 * cleared). Business name, period and notes are kept. Only this student's row
 * is touched — the shared template and other statements are unaffected.
 */
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

    const type = row.statementType;
    const current = normalizeData(type, row.data);
    const fresh = createDefaultData(type);
    fresh.meta = { ...fresh.meta, ...current.meta, options: fresh.meta.options };

    const result = await db.financialStatement.updateMany({
      where: { id: row.id, studentId: access.userId },
      data: {
        ...persistedColumns(type, fresh),
        data: toJson(fresh),
        results: toJson(computeResults(type, fresh)),
        status: "DRAFT",
        generatedAt: null,
      },
    });
    if (result.count !== 1) return NextResponse.json({ message: "Statement not found." }, { status: 404 });

    const saved = await loadOwnedStatement(row.id, access.userId);
    if (!saved) return NextResponse.json({ message: "Statement not found." }, { status: 404 });
    const statement = toDetail(saved);
    return NextResponse.json({ statement, issues: validateStatement(type, statement.data) });
  } catch (error) {
    console.error("RESET_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to reset the statement." }, { status: 500 });
  }
}
