import { NextResponse } from "next/server";
import {
  denied,
  loadOwnedBusinessPlan,
  requireBusinessPlanStudent,
  toBusinessPlanRecord,
} from "@/lib/business-plan/access";
import {
  renderBusinessPlanDocx,
  renderBusinessPlanPdf,
} from "@/lib/business-plan/export";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function safeFileSlug(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "business-plan";
}

export async function GET(request: Request, context: RouteContext) {
  const access = await requireBusinessPlanStudent(request);
  if (!access.ok) return denied(access);

  const { id } = await context.params;
  const owned = await loadOwnedBusinessPlan(id, access.userId);
  if (!owned) {
    return NextResponse.json({ message: "Business plan not found." }, { status: 404 });
  }

  const record = toBusinessPlanRecord(owned);
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") ?? "pdf").toLowerCase();
  const slug = safeFileSlug(record.data.businessInfo.businessName || record.title);

  if (format === "docx" || format === "word") {
    const docxBuffer = renderBusinessPlanDocx(record, access.name);
    return new NextResponse(new Uint8Array(docxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${slug}.docx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdfBuffer = renderBusinessPlanPdf(record, access.name);
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slug}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

