import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  ensureBusinessPlanTable,
  requireBusinessPlanStudent,
  sameOriginViolation,
  toBusinessPlanRecord,
  toBusinessPlanSummary,
} from "@/lib/business-plan/access";
import { calculateFinancialPlan } from "@/lib/business-plan/calculator";
import {
  getBusinessPlanTemplateById,
  instantiateBusinessPlanTemplate,
} from "@/lib/business-plan/templates";
import {
  createEmptyBusinessPlanData,
  sanitizeBusinessPlanData,
  validateBusinessPlan,
} from "@/lib/business-plan/validation";
import type { BusinessCategory } from "@/lib/business-plan/types";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const access = await requireBusinessPlanStudent(request);
  if (!access.ok) return denied(access);

  await ensureBusinessPlanTable();
  const rows = await db.businessPlan.findMany({
    where: { studentId: access.userId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    plans: rows.map(toBusinessPlanSummary),
  });
}

export async function POST(request: Request) {
  const csrf = sameOriginViolation(request);
  if (csrf) return csrf;

  const access = await requireBusinessPlanStudent(request);
  if (!access.ok) return denied(access);

  let body: {
    title?: string;
    businessCategory?: BusinessCategory;
    templateId?: string;
    includeSampleFinancials?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON request body." }, { status: 400 });
  }

  await ensureBusinessPlanTable();

  let planData = createEmptyBusinessPlanData();
  let resolvedTemplateId: string | null = null;

  if (body.templateId) {
    const template = getBusinessPlanTemplateById(body.templateId);
    if (!template) {
      return NextResponse.json({ message: "Requested template was not found." }, { status: 404 });
    }
    const instantiated = instantiateBusinessPlanTemplate(body.templateId, {
      includeSampleFinancials: Boolean(body.includeSampleFinancials),
      studentName: access.name,
    });
    if (instantiated) {
      planData = instantiated;
      resolvedTemplateId = template.id;
    }
  } else {
    planData.documentSetup.studentNames = access.name;
    planData.documentSetup.schoolOrProgram = "Institute of Business and Entrepreneurship (IBE)";
    if (body.businessCategory) {
      planData.businessInfo.businessCategory = body.businessCategory;
    }
  }

  const cleanTitle =
    (body.title ?? "").trim() ||
    planData.documentSetup.documentTitle ||
    planData.businessInfo.businessName ||
    "Untitled Business Plan";

  planData.documentSetup.documentTitle = cleanTitle;
  const sanitized = sanitizeBusinessPlanData(planData);

  const created = await db.businessPlan.create({
    data: {
      studentId: access.userId,
      instituteId: access.instituteId,
      title: cleanTitle.slice(0, 180),
      documentType: "BUSINESS_PLAN",
      status: "DRAFT",
      businessCategory: sanitized.businessInfo.businessCategory,
      data: sanitized as unknown as Prisma.InputJsonValue,
      templateId: resolvedTemplateId,
    },
  });

  const record = toBusinessPlanRecord(created);
  const validation = validateBusinessPlan(record.data);
  const financials = calculateFinancialPlan(record.data.financialPlan);

  return NextResponse.json(
    {
      plan: record,
      validation,
      financials,
    },
    { status: 201 }
  );
}
