import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  loadOwnedStatement,
  requireFinancialStudent,
  sameOriginViolation,
} from "@/lib/financial-statements/access";
import { normalizeData } from "@/lib/financial-statements/data";
import { saveStatementSchema } from "@/lib/financial-statements/schemas";
import { computeResults, persistedColumns, toDetail, toJson } from "@/lib/financial-statements/server";
import { isStatementType } from "@/lib/financial-statements/types";
import { validateStatement } from "@/lib/financial-statements/validate";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ message: "Statement not found." }, { status: 404 });

/** GET /api/financial-statements/[id] — one of the student's own statements. */
export async function GET(request: Request, { params }: Ctx) {
  try {
    const access = await requireFinancialStudent(request);
    if (!access.ok) return denied(access);
    const { id } = await params;
    const row = await loadOwnedStatement(id, access.userId);
    if (!row || !isStatementType(row.statementType)) return notFound();
    const statement = toDetail(row);
    return NextResponse.json({ statement, issues: validateStatement(statement.statementType, statement.data) });
  } catch (error) {
    console.error("GET_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to load the statement." }, { status: 500 });
  }
}

/**
 * PATCH /api/financial-statements/[id] — save the draft (never generates).
 * Saving a previously generated statement returns it to DRAFT so a PDF can
 * never disagree with the saved figures.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const blocked = sameOriginViolation(request);
    if (blocked) return blocked;
    const access = await requireFinancialStudent(request);
    if (!access.ok) return denied(access);
    const { id } = await params;
    const row = await loadOwnedStatement(id, access.userId);
    if (!row || !isStatementType(row.statementType)) return notFound();

    const body = saveStatementSchema.safeParse(await request.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ message: "The statement data is not in a valid format." }, { status: 400 });
    }

    const type = row.statementType;
    const data = normalizeData(type, body.data.data);
    const result = await db.financialStatement.updateMany({
      where: { id: row.id, studentId: access.userId },
      data: {
        ...persistedColumns(type, data),
        data: toJson(data),
        results: toJson(computeResults(type, data)),
        status: "DRAFT",
        generatedAt: null,
      },
    });
    if (result.count !== 1) return notFound();

    const saved = await loadOwnedStatement(row.id, access.userId);
    if (!saved) return notFound();
    const statement = toDetail(saved);
    return NextResponse.json({ statement, issues: validateStatement(type, statement.data) });
  } catch (error) {
    console.error("PATCH_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to save the statement." }, { status: 500 });
  }
}

/** DELETE /api/financial-statements/[id] */
export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const blocked = sameOriginViolation(request);
    if (blocked) return blocked;
    const access = await requireFinancialStudent(request);
    if (!access.ok) return denied(access);
    const { id } = await params;
    const row = await loadOwnedStatement(id, access.userId);
    if (!row) return notFound();
    await db.financialStatement.deleteMany({ where: { id: row.id, studentId: access.userId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to delete the statement." }, { status: 500 });
  }
}
