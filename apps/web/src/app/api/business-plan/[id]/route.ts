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
import type { BusinessPlanStatus } from "@/lib/business-plan/types";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const access = await requireBusinessPlanStudent(request);
    if (!access.ok) return denied(access);

    const { id } = await context.params;
    const owned = await loadOwnedBusinessPlan(id, access.userId);
    if (!owned) {
      return NextResponse.json({ message: "Business plan not found." }, { status: 404 });
    }

    const record = toBusinessPlanRecord(owned);
    const validation = validateBusinessPlan(record.data);
    const financials = calculateFinancialPlan(record.data.financialPlan);

    return NextResponse.json({
      plan: record,
      validation,
      financials,
    });
  } catch (error) {
    console.error("GET_BUSINESS_PLAN_ID_ERROR", error);
    return NextResponse.json({ message: "Failed to load business plan." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const csrf = sameOriginViolation(request);
    if (csrf) return csrf;

    const access = await requireBusinessPlanStudent(request);
    if (!access.ok) return denied(access);

    const { id } = await context.params;
    const owned = await loadOwnedBusinessPlan(id, access.userId);
    if (!owned) {
      return NextResponse.json({ message: "Business plan not found." }, { status: 404 });
    }

    let body: {
      title?: string;
      status?: BusinessPlanStatus;
      data?: unknown;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON request body." }, { status: 400 });
    }

    const sanitizedData = sanitizeBusinessPlanData(body.data ?? owned.data);

    const validation = validateBusinessPlan(sanitizedData);
    const financials = calculateFinancialPlan(sanitizedData.financialPlan);

    const requestedStatus: BusinessPlanStatus =
      body.status === "COMPLETED" ? "COMPLETED" : "DRAFT";

    if (requestedStatus === "COMPLETED" && !validation.isReadyForCompletion) {
      return NextResponse.json(
        {
          message:
            "Cannot mark document as Completed while required sections or financial validations are incomplete.",
          validation,
          financials,
        },
        { status: 422 }
      );
    }

    const cleanTitle =
      (body.title ?? "").trim() ||
      sanitizedData.documentSetup.documentTitle ||
      sanitizedData.businessInfo.businessName ||
      owned.title ||
      "Untitled Business Plan";

    sanitizedData.documentSetup.documentTitle = cleanTitle;

    const updated = await db.businessPlan.update({
      where: { id: owned.id },
      data: {
        title: cleanTitle.slice(0, 180),
        documentType: "BUSINESS_PLAN",
        status: requestedStatus,
        businessCategory: sanitizedData.businessInfo.businessCategory,
        data: sanitizedData as unknown as Prisma.InputJsonValue,
        completedAt: requestedStatus === "COMPLETED" ? new Date() : null,
      },
    });

    const record = toBusinessPlanRecord(updated);
    return NextResponse.json({
      plan: record,
      validation,
      financials,
    });
  } catch (error) {
    console.error("PUT_BUSINESS_PLAN_ID_ERROR", error);
    return NextResponse.json({ message: "Failed to save business plan." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const csrf = sameOriginViolation(request);
    if (csrf) return csrf;

    const access = await requireBusinessPlanStudent(request);
    if (!access.ok) return denied(access);

    const { id } = await context.params;
    const owned = await loadOwnedBusinessPlan(id, access.userId);
    if (!owned) {
      return NextResponse.json({ message: "Business plan not found." }, { status: 404 });
    }

    await db.businessPlan.delete({
      where: { id: owned.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE_BUSINESS_PLAN_ID_ERROR", error);
    return NextResponse.json({ message: "Failed to delete business plan." }, { status: 500 });
  }
}
