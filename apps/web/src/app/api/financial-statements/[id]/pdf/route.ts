import { NextResponse } from "next/server";
import { buildStatement } from "@/lib/financial-statements/build";
import { denied, loadOwnedStatement, requireFinancialStudent } from "@/lib/financial-statements/access";
import { normalizeData } from "@/lib/financial-statements/data";
import { renderStatementPdf } from "@/lib/financial-statements/pdf";
import { slug } from "@/lib/financial-statements/server";
import { isStatementType } from "@/lib/financial-statements/types";
import { hasBlockingErrors, validateStatement } from "@/lib/financial-statements/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/financial-statements/[id]/pdf
 * Renders the PDF from the student's saved data at request time, so the file
 * can never differ from the stored figures. Only GENERATED statements export.
 */
export async function GET(request: Request, { params }: Ctx) {
  try {
    const access = await requireFinancialStudent(request);
    if (!access.ok) return denied(access);
    const { id } = await params;
    const row = await loadOwnedStatement(id, access.userId);
    if (!row || !isStatementType(row.statementType)) {
      return NextResponse.json({ message: "Statement not found." }, { status: 404 });
    }
    if (row.status !== "GENERATED") {
      return NextResponse.json({ message: "Generate the statement before downloading the PDF." }, { status: 409 });
    }

    const type = row.statementType;
    const data = normalizeData(type, row.data);
    if (hasBlockingErrors(validateStatement(type, data))) {
      return NextResponse.json({ message: "This statement has problems. Edit and generate it again." }, { status: 409 });
    }

    const { document } = buildStatement(type, data);
    const pdf = renderStatementPdf(document, {
      generatedAt: row.generatedAt ?? new Date(),
      preparedBy: access.name,
    });
    const filename = `${slug(document.businessName)}-${slug(document.title)}.pdf`;
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("PDF_FINANCIAL_STATEMENT_ERROR", error);
    return NextResponse.json({ message: "Failed to create the PDF." }, { status: 500 });
  }
}
