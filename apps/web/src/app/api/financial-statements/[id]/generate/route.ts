import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  loadOwnedStatement,
  requireFinancialStudent,
  sameOriginViolation,
} from "@/lib/financial-statements/access";
import { normalizeData } from "@/lib/financial-statements/data";
import { generateStatementSchema } from "@/lib/financial-statements/schemas";
import { computeResults, persistedColumns, toDetail, toJson } from "@/lib/financial-statements/server";
import { isStatementType } from "@/lib/financial-statements/types";
import { hasBlockingErrors, validateStatement } from "@/lib/financial-statements/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/financial-statements/[id]/generate
 * Re-validates server-side (the client is never trusted). Blocking errors →
 * 422 with the issue list and nothing is finalized.
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

    const body = generateStatementSchema.safeParse(await request.json().catch(() => ({})));
    if (!body.success) {
      return NextResponse.json({ message: "The statement data is not in a valid format." }, { status: 400 });
    }

    const type = row.statementType;
    const data = normalizeData(type, body.data.data ?? row.data);
    const issues = validateStatement(type, data);
    if (hasBlockingErrors(issues)) {
      return NextResponse.json(
        { message: "Fix the highlighted problems before generating the statement.", issues },
        { status: 422 },
      );
    }

    const result = await db.financialStatement.updateMany({
      where: { id: row.id, studentId: access.userId },
      data: {
        ...persistedColumns(type, data),
        data: toJson(data),
        results: toJson(computeResults(type, data)),
        status: "GENERATED",
        generatedAt: new Date(),
      },
    });
    if (result.count !== 1) return NextResponse.json({ message: "Statement not found." }, { status: 404 });

    const saved = await loadOwnedStatement(row.id, access.userId);
    if (!saved) return NextResponse.json({ message: "Statement not found." }, { status: 404 });
    return NextResponse.json({ statement: toDetail(saved), issues });
  } catch (error) {
    console.error("GENERATE_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to generate the statement." }, { status: 500 });
  }
}
