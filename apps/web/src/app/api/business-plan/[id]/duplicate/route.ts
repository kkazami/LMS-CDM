import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  denied,
  loadOwnedBusinessPlan,
  requireBusinessPlanStudent,
  sameOriginViolation,
  toBusinessPlanRecord,
} from "@/lib/business-plan/access";
import { calculateFinancialPlan } from "@/lib/business-plan/calculator";
import {
  sanitizeBusinessPlanData,
  validateBusinessPlan,
} from "@/lib/business-plan/validation";
import type { Prisma } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const csrf = sameOriginViolation(request);
  if (csrf) return csrf;

  const access = await requireBusinessPlanStudent(request);
  if (!access.ok) return denied(access);

  const { id } = await context.params;
  const owned = await loadOwnedBusinessPlan(id, access.userId);
  if (!owned) {
    return NextResponse.json({ message: "Business plan not found." }, { status: 404 });
  }

  const sanitized = sanitizeBusinessPlanData(owned.data);
  const copyTitle = `${owned.title || "Untitled Business Plan"} (Copy)`.slice(0, 180);
  sanitized.documentSetup.documentTitle = copyTitle;

  const duplicated = await db.businessPlan.create({
    data: {
      studentId: access.userId,
      instituteId: access.instituteId,
      title: copyTitle,
      documentType: "BUSINESS_PLAN",
      status: "DRAFT",
      businessCategory: sanitized.businessInfo.businessCategory,
      data: sanitized as unknown as Prisma.InputJsonValue,
      templateId: owned.templateId,
    },
  });

  const record = toBusinessPlanRecord(duplicated);
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
