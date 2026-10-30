import { calculateFinancialPlan } from "./calculator";
import type {
  BusinessCategory,
  BusinessOwnershipType,
  BusinessPlanData,
  BusinessPlanDocumentType,
  BusinessPlanRecord,
  BusinessPlanStatus,
  BusinessPlanSummary,
  BusinessPlanValidationResult,
  SectionValidationStatus,
  StepKey,
  StepValidationResult,
} from "./types";

export const BUSINESS_PLAN_ID = /^[a-zA-Z0-9_-]{8,64}$/;

export const STEP_METADATA: {
  stepNumber: number;
  key: StepKey;
  title: string;
  shortTitle: string;
}[] = [
  { stepNumber: 1, key: "documentSetup", title: "Business Plan Setup & Cover Details", shortTitle: "Plan Setup" },
  { stepNumber: 2, key: "businessInfo", title: "Business Information", shortTitle: "Business Info" },
  { stepNumber: 3, key: "executiveSummary", title: "Executive Summary", shortTitle: "Executive Summary" },
  { stepNumber: 4, key: "marketAnalysis", title: "Market Analysis", shortTitle: "Market Analysis" },
  { stepNumber: 5, key: "marketingSalesPlan", title: "Marketing and Sales Plan", shortTitle: "Marketing & Sales" },
  { stepNumber: 6, key: "operationalPlan", title: "Operational Plan", shortTitle: "Operational Plan" },
  { stepNumber: 7, key: "managementHrPlan", title: "Management and Human Resources Plan", shortTitle: "Management & HR" },
  { stepNumber: 8, key: "financialPlan", title: "Financial Plan and Calculator", shortTitle: "Financial Plan" },
  { stepNumber: 9, key: "taxConsiderations", title: "Tax and Financial Considerations", shortTitle: "Tax & Regulatory" },
  { stepNumber: 10, key: "riskFeasibility", title: "Risk Assessment and Feasibility", shortTitle: "Risk & Feasibility" },
  { stepNumber: 11, key: "conclusionAppendices", title: "Conclusion and Supporting Documents", shortTitle: "Conclusion & Docs" },
];

export function createEmptyBusinessPlanData(): BusinessPlanData {
  return {
    documentSetup: {
      documentType: "BUSINESS_PLAN",
      targetAudience: "",
      documentTitle: "",
      studentNames: "",
      schoolOrProgram: "Institute of Business and Entrepreneurship (IBE)",
      courseAndSection: "",
      instructorName: "",
      submissionDate: new Date().toISOString().slice(0, 10),
    },
    businessInfo: {
      businessName: "",
      businessCategory: "FOOD_BEVERAGE",
      description: "",
      location: "",
      ownershipType: "SOLE_PROPRIETORSHIP",
      mission: "",
      vision: "",
      objectives: "",
      productsOrServices: "",
      problemSolved: "",
    },
    executiveSummary: {
      businessConcept: "",
      targetMarketSummary: "",
      productsServicesSummary: "",
      competitiveAdvantage: "",
      financialOverview: "",
      businessObjectivesSummary: "",
    },
    marketAnalysis: {
      targetCustomers: "",
      customerNeeds: "",
      marketResearchFindings: "",
      surveyResultsSummary: "",
      competitors: [],
      marketOpportunities: "",
      swotStrengths: "",
      swotWeaknesses: "",
      swotOpportunities: "",
      swotThreats: "",
    },
    marketingSalesPlan: {
      productServiceStrategy: "",
      pricingStrategy: "",
      promotionAdvertising: "",
      distributionDelivery: "",
      salesChannels: "",
      customerAcquisition: "",
      customerRetention: "",
    },
    operationalPlan: {
      businessLocation: "",
      equipmentAndSupplies: "",
      materialsAndSuppliers: "",
      productionOrServiceProcess: "",
      inventoryRequirements: "",
      operatingSchedule: "",
      estimatedOperatingCapacity: "",
      qualityControl: "",
      categorySpecificNotes: "",
    },
    managementHrPlan: {
      organizationalStructure: "",
      ownershipManagementRoles: "",
      staffingRequirements: [],
      jobDescriptions: "",
      employeeResponsibilities: "",
      recruitmentSelectionApproach: "",
      employeeTraining: "",
      workplacePolicies: "",
    },
    financialPlan: {
      startupCosts: [],
      fundingSources: [],
      salesForecast: [],
      operatingExpenses: [],
      monthlyNonOperatingExpense: 0,
      estimatedMonthlyTaxExpense: 0,
      estimatedMonthlyDepreciation: 0,
      financialAssumptions: "",
    },
    taxConsiderations: {
      checkedItemIds: [],
      chosenStructureNotes: "",
      regulatoryComplianceNotes: "",
    },
    riskFeasibility: {
      marketRisks: "",
      financialRisks: "",
      operationalRisks: "",
      staffingRisks: "",
      regulatoryRisks: "",
      mitigationStrategies: "",
      feasibilityChecklist: {
        marketDemandVerified: false,
        operationalCapacityRealistic: false,
        capitalRequirementsAchievable: false,
        projectedProfitabilityPositive: false,
      },
      feasibilityConclusionStatus: "UNREVIEWED",
      feasibilityStudentConclusion: "",
    },
    conclusionAppendices: {
      businessConclusion: "",
      implementationTimeline: [],
      supportingResearch: "",
      surveySummaries: "",
      supplierQuotations: [],
      additionalAppendices: "",
    },
  };
}

function hasText(val: string | undefined, minLen = 2): boolean {
  return typeof val === "string" && val.trim().length >= minLen;
}

export function validateBusinessPlan(data: BusinessPlanData): BusinessPlanValidationResult {
  const calc = calculateFinancialPlan(data.financialPlan);

  const steps: StepValidationResult[] = STEP_METADATA.map((meta) => {
    const missingFields: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    switch (meta.stepNumber) {
      case 1: {
        if (!hasText(data.documentSetup.studentNames)) missingFields.push("Prepared By (Student Names)");
        if (!hasText(data.documentSetup.schoolOrProgram)) missingFields.push("School / Program");
        break;
      }
      case 2: {
        if (!hasText(data.businessInfo.businessName)) missingFields.push("Proposed Business Name");
        if (!hasText(data.businessInfo.description, 10)) missingFields.push("Business Description");
        if (!hasText(data.businessInfo.location)) missingFields.push("Proposed Business Location");
        if (!hasText(data.businessInfo.mission)) missingFields.push("Mission Statement");
        if (!hasText(data.businessInfo.vision)) missingFields.push("Vision Statement");
        if (!hasText(data.businessInfo.objectives)) missingFields.push("Business Objectives");
        if (!hasText(data.businessInfo.productsOrServices)) missingFields.push("Products or Services");
        if (!hasText(data.businessInfo.problemSolved)) missingFields.push("Problem Solved");
        break;
      }
      case 3: {
        if (!hasText(data.executiveSummary.businessConcept)) missingFields.push("Business Concept");
        if (!hasText(data.executiveSummary.targetMarketSummary)) missingFields.push("Target Market Summary");
        if (!hasText(data.executiveSummary.productsServicesSummary)) missingFields.push("Products/Services Summary");
        if (!hasText(data.executiveSummary.competitiveAdvantage)) missingFields.push("Competitive Advantage");
        if (!hasText(data.executiveSummary.financialOverview)) missingFields.push("Financial Overview");
        if (!hasText(data.executiveSummary.businessObjectivesSummary)) missingFields.push("Objectives Summary");
        break;
      }
      case 4: {
        if (!hasText(data.marketAnalysis.targetCustomers)) missingFields.push("Target Customers");
        if (!hasText(data.marketAnalysis.customerNeeds)) missingFields.push("Customer Needs");
        if (!hasText(data.marketAnalysis.marketResearchFindings)) missingFields.push("Market Research Findings");
        if (data.marketAnalysis.competitors.length === 0) missingFields.push("At least 1 Competitor Entry");
        if (!hasText(data.marketAnalysis.marketOpportunities)) missingFields.push("Market Opportunities");
        if (!hasText(data.marketAnalysis.swotStrengths)) missingFields.push("SWOT Strengths");
        if (!hasText(data.marketAnalysis.swotWeaknesses)) missingFields.push("SWOT Weaknesses");
        if (!hasText(data.marketAnalysis.swotOpportunities)) missingFields.push("SWOT Opportunities");
        if (!hasText(data.marketAnalysis.swotThreats)) missingFields.push("SWOT Threats");
        break;
      }
      case 5: {
        if (!hasText(data.marketingSalesPlan.productServiceStrategy)) missingFields.push("Product/Service Strategy");
        if (!hasText(data.marketingSalesPlan.pricingStrategy)) missingFields.push("Pricing Strategy");
        if (!hasText(data.marketingSalesPlan.promotionAdvertising)) missingFields.push("Promotion & Advertising");
        if (!hasText(data.marketingSalesPlan.distributionDelivery)) missingFields.push("Distribution or Delivery");
        if (!hasText(data.marketingSalesPlan.salesChannels)) missingFields.push("Sales Channels");
        if (!hasText(data.marketingSalesPlan.customerAcquisition)) missingFields.push("Customer Acquisition");
        if (!hasText(data.marketingSalesPlan.customerRetention)) missingFields.push("Customer Retention");
        break;
      }
      case 6: {
        if (!hasText(data.operationalPlan.businessLocation)) missingFields.push("Business Location Layout");
        if (!hasText(data.operationalPlan.equipmentAndSupplies)) missingFields.push("Equipment & Supplies");
        if (!hasText(data.operationalPlan.materialsAndSuppliers)) missingFields.push("Materials & Suppliers");
        if (!hasText(data.operationalPlan.productionOrServiceProcess)) missingFields.push("Production/Service Process");
        if (!hasText(data.operationalPlan.inventoryRequirements)) missingFields.push("Inventory Requirements");
        if (!hasText(data.operationalPlan.operatingSchedule)) missingFields.push("Operating Schedule");
        if (!hasText(data.operationalPlan.estimatedOperatingCapacity)) missingFields.push("Estimated Operating Capacity");
        if (!hasText(data.operationalPlan.qualityControl)) missingFields.push("Quality Control");
        break;
      }
      case 7: {
        if (!hasText(data.managementHrPlan.organizationalStructure)) missingFields.push("Organizational Structure");
        if (!hasText(data.managementHrPlan.ownershipManagementRoles)) missingFields.push("Ownership & Management Roles");
        if (data.managementHrPlan.staffingRequirements.length === 0) missingFields.push("At least 1 Staffing Role");
        if (!hasText(data.managementHrPlan.jobDescriptions)) missingFields.push("Job Descriptions");
        if (!hasText(data.managementHrPlan.employeeResponsibilities)) missingFields.push("Employee Responsibilities");
        if (!hasText(data.managementHrPlan.recruitmentSelectionApproach)) missingFields.push("Recruitment & Selection");
        if (!hasText(data.managementHrPlan.employeeTraining)) missingFields.push("Employee Training");
        if (!hasText(data.managementHrPlan.workplacePolicies)) missingFields.push("Workplace Policies");
        break;
      }
      case 8: {
        if (data.financialPlan.startupCosts.length === 0) missingFields.push("Startup Cost Rows");
        if (data.financialPlan.fundingSources.length === 0) missingFields.push("Owner Contributions / Funding Sources");
        if (data.financialPlan.salesForecast.length === 0 || calc.monthlySalesRevenue <= 0) {
          missingFields.push("Sales Forecast with positive revenue");
        }
        if (data.financialPlan.operatingExpenses.length === 0) missingFields.push("Operating Expense Rows");
        if (!hasText(data.financialPlan.financialAssumptions)) missingFields.push("Financial Assumptions");

        for (const w of calc.warnings) {
          if (w.severity === "ERROR") errors.push(w.message);
          else warnings.push(w.message);
        }
        break;
      }
      case 9: {
        if (data.taxConsiderations.checkedItemIds.length < 3) {
          missingFields.push("Review at least 3 Philippine Tax & Registration Checklist items");
        }
        if (!hasText(data.taxConsiderations.chosenStructureNotes)) {
          missingFields.push("Chosen Legal Structure Notes");
        }
        if (!hasText(data.taxConsiderations.regulatoryComplianceNotes)) {
          missingFields.push("Regulatory & Bookkeeping Compliance Notes");
        }
        break;
      }
      case 10: {
        if (!hasText(data.riskFeasibility.marketRisks)) missingFields.push("Market Risks");
        if (!hasText(data.riskFeasibility.financialRisks)) missingFields.push("Financial Risks");
        if (!hasText(data.riskFeasibility.operationalRisks)) missingFields.push("Operational Risks");
        if (!hasText(data.riskFeasibility.staffingRisks)) missingFields.push("Staffing Risks");
        if (!hasText(data.riskFeasibility.regulatoryRisks)) missingFields.push("Regulatory Risks");
        if (!hasText(data.riskFeasibility.mitigationStrategies)) missingFields.push("Mitigation Strategies");
        if (!hasText(data.riskFeasibility.feasibilityStudentConclusion)) {
          missingFields.push("Student Feasibility Justification");
        }
        if (data.riskFeasibility.feasibilityConclusionStatus === "UNREVIEWED") {
          warnings.push("Select your manual Feasibility Assessment Status after reviewing all 4 pillars.");
        }
        break;
      }
      case 11: {
        if (!hasText(data.conclusionAppendices.businessConclusion)) missingFields.push("Business Conclusion");
        if (data.conclusionAppendices.implementationTimeline.length === 0) {
          missingFields.push("At least 1 Implementation Timeline Milestone");
        }
        break;
      }
    }

    let status: SectionValidationStatus = "COMPLETED";
    if (errors.length > 0) {
      status = "INVALID";
    } else if (missingFields.length > 0) {
      status = "INCOMPLETE";
    } else if (warnings.length > 0) {
      status = "READY_FOR_REVIEW";
    }

    return {
      stepNumber: meta.stepNumber,
      key: meta.key,
      title: meta.title,
      shortTitle: meta.shortTitle,
      status,
      missingFields,
      warnings,
      errors,
    };
  });

  const completedSteps = steps.filter(
    (s) => s.status === "COMPLETED" || s.status === "READY_FOR_REVIEW"
  ).length;
  const totalSteps = steps.length;
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100);
  const hasInvalidOrIncomplete = steps.some(
    (s) => s.status === "INCOMPLETE" || s.status === "INVALID"
  );
  const isFeasibilityReviewed =
    data.riskFeasibility.feasibilityConclusionStatus !== "UNREVIEWED";

  return {
    steps,
    completedSteps,
    totalSteps,
    completionPercentage,
    isReadyForCompletion: !hasInvalidOrIncomplete && isFeasibilityReviewed,
  };
}

const VALID_CATEGORIES = new Set<BusinessCategory>([
  "FOOD_BEVERAGE",
  "RETAIL",
  "ONLINE_COMMERCE",
  "SERVICES",
  "HOSPITALITY_TOURISM",
  "MANUFACTURING_PRODUCTION",
  "CAMPUS_ENTERPRISE",
]);
const VALID_OWNERSHIP = new Set<BusinessOwnershipType>([
  "SOLE_PROPRIETORSHIP",
  "PARTNERSHIP",
  "CORPORATION",
  "ONE_PERSON_CORPORATION",
  "COOPERATIVE",
]);

function cleanStr(val: unknown, maxLen = 8000): string {
  if (typeof val !== "string") return "";
  return val.slice(0, maxLen);
}

function cleanNum(val: unknown): number {
  const n = typeof val === "number" ? val : Number(val);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sanitizeBusinessPlanData(raw: unknown): BusinessPlanData {
  const empty = createEmptyBusinessPlanData();
  if (!raw || typeof raw !== "object") return empty;

  const obj = raw as Record<string, unknown>;
  const ds = (obj.documentSetup ?? {}) as Record<string, unknown>;
  const bi = (obj.businessInfo ?? {}) as Record<string, unknown>;
  const es = (obj.executiveSummary ?? {}) as Record<string, unknown>;
  const ma = (obj.marketAnalysis ?? {}) as Record<string, unknown>;
  const ms = (obj.marketingSalesPlan ?? {}) as Record<string, unknown>;
  const op = (obj.operationalPlan ?? {}) as Record<string, unknown>;
  const hr = (obj.managementHrPlan ?? {}) as Record<string, unknown>;
  const fp = (obj.financialPlan ?? {}) as Record<string, unknown>;
  const tx = (obj.taxConsiderations ?? {}) as Record<string, unknown>;
  const rf = (obj.riskFeasibility ?? {}) as Record<string, unknown>;
  const ca = (obj.conclusionAppendices ?? {}) as Record<string, unknown>;
  const fc = (rf.feasibilityChecklist ?? {}) as Record<string, unknown>;

  return {
    documentSetup: {
      documentType: "BUSINESS_PLAN",
      targetAudience: cleanStr(ds.targetAudience, 400),
      documentTitle: cleanStr(ds.documentTitle, 300),
      studentNames: cleanStr(ds.studentNames, 400),
      schoolOrProgram:
        cleanStr(ds.schoolOrProgram, 400) ||
        "Institute of Business and Entrepreneurship (IBE)",
      courseAndSection: cleanStr(ds.courseAndSection, 200),
      instructorName: cleanStr(ds.instructorName, 200),
      submissionDate: cleanStr(ds.submissionDate, 40) || empty.documentSetup.submissionDate,
    },
    businessInfo: {
      businessName: cleanStr(bi.businessName, 300),
      businessCategory: VALID_CATEGORIES.has(bi.businessCategory as BusinessCategory)
        ? (bi.businessCategory as BusinessCategory)
        : "FOOD_BEVERAGE",
      description: cleanStr(bi.description),
      location: cleanStr(bi.location, 500),
      ownershipType: VALID_OWNERSHIP.has(bi.ownershipType as BusinessOwnershipType)
        ? (bi.ownershipType as BusinessOwnershipType)
        : "SOLE_PROPRIETORSHIP",
      mission: cleanStr(bi.mission),
      vision: cleanStr(bi.vision),
      objectives: cleanStr(bi.objectives),
      productsOrServices: cleanStr(bi.productsOrServices),
      problemSolved: cleanStr(bi.problemSolved),
    },
    executiveSummary: {
      businessConcept: cleanStr(es.businessConcept),
      targetMarketSummary: cleanStr(es.targetMarketSummary),
      productsServicesSummary: cleanStr(es.productsServicesSummary),
      competitiveAdvantage: cleanStr(es.competitiveAdvantage),
      financialOverview: cleanStr(es.financialOverview),
      businessObjectivesSummary: cleanStr(es.businessObjectivesSummary),
    },
    marketAnalysis: {
      targetCustomers: cleanStr(ma.targetCustomers),
      customerNeeds: cleanStr(ma.customerNeeds),
      marketResearchFindings: cleanStr(ma.marketResearchFindings),
      surveyResultsSummary: cleanStr(ma.surveyResultsSummary),
      competitors: Array.isArray(ma.competitors)
        ? ma.competitors.slice(0, 40).map((c, idx) => {
            const row = (c ?? {}) as Record<string, unknown>;
            return {
              id: cleanStr(row.id, 64) || `comp-${idx + 1}`,
              name: cleanStr(row.name, 200),
              priceRange: cleanStr(row.priceRange, 150),
              strengths: cleanStr(row.strengths, 1000),
              weaknesses: cleanStr(row.weaknesses, 1000),
            };
          })
        : [],
      marketOpportunities: cleanStr(ma.marketOpportunities),
      swotStrengths: cleanStr(ma.swotStrengths),
      swotWeaknesses: cleanStr(ma.swotWeaknesses),
      swotOpportunities: cleanStr(ma.swotOpportunities),
      swotThreats: cleanStr(ma.swotThreats),
    },
    marketingSalesPlan: {
      productServiceStrategy: cleanStr(ms.productServiceStrategy),
      pricingStrategy: cleanStr(ms.pricingStrategy),
      promotionAdvertising: cleanStr(ms.promotionAdvertising),
      distributionDelivery: cleanStr(ms.distributionDelivery),
      salesChannels: cleanStr(ms.salesChannels),
      customerAcquisition: cleanStr(ms.customerAcquisition),
      customerRetention: cleanStr(ms.customerRetention),
    },
    operationalPlan: {
      businessLocation: cleanStr(op.businessLocation),
      equipmentAndSupplies: cleanStr(op.equipmentAndSupplies),
      materialsAndSuppliers: cleanStr(op.materialsAndSuppliers),
      productionOrServiceProcess: cleanStr(op.productionOrServiceProcess),
      inventoryRequirements: cleanStr(op.inventoryRequirements),
      operatingSchedule: cleanStr(op.operatingSchedule),
      estimatedOperatingCapacity: cleanStr(op.estimatedOperatingCapacity),
      qualityControl: cleanStr(op.qualityControl),
      categorySpecificNotes: cleanStr(op.categorySpecificNotes),
    },
    managementHrPlan: {
      organizationalStructure: cleanStr(hr.organizationalStructure),
      ownershipManagementRoles: cleanStr(hr.ownershipManagementRoles),
      staffingRequirements: Array.isArray(hr.staffingRequirements)
        ? hr.staffingRequirements.slice(0, 40).map((s, idx) => {
            const row = (s ?? {}) as Record<string, unknown>;
            return {
              id: cleanStr(row.id, 64) || `staff-${idx + 1}`,
              roleTitle: cleanStr(row.roleTitle, 200),
              headcount: Math.max(1, Math.round(cleanNum(row.headcount) || 1)),
              monthlyCompensation: cleanNum(row.monthlyCompensation),
              responsibilities: cleanStr(row.responsibilities, 1000),
            };
          })
        : [],
      jobDescriptions: cleanStr(hr.jobDescriptions),
      employeeResponsibilities: cleanStr(hr.employeeResponsibilities),
      recruitmentSelectionApproach: cleanStr(hr.recruitmentSelectionApproach),
      employeeTraining: cleanStr(hr.employeeTraining),
      workplacePolicies: cleanStr(hr.workplacePolicies),
    },
    financialPlan: {
      startupCosts: Array.isArray(fp.startupCosts)
        ? fp.startupCosts.slice(0, 100).map((r, idx) => {
            const row = (r ?? {}) as Record<string, unknown>;
            const cat =
              row.category === "CAPEX" || row.category === "WORKING_CAPITAL"
                ? row.category
                : "PRE_OPERATING";
            return {
              id: cleanStr(row.id, 64) || `sc-${idx + 1}`,
              description: cleanStr(row.description, 300),
              category: cat,
              amount: cleanNum(row.amount),
            };
          })
        : [],
      fundingSources: Array.isArray(fp.fundingSources)
        ? fp.fundingSources.slice(0, 50).map((r, idx) => {
            const row = (r ?? {}) as Record<string, unknown>;
            const st =
              row.sourceType === "FAMILY_GRANT" || row.sourceType === "LOAN"
                ? row.sourceType
                : "OWNER_EQUITY";
            return {
              id: cleanStr(row.id, 64) || `fund-${idx + 1}`,
              description: cleanStr(row.description, 300),
              sourceType: st,
              amount: cleanNum(row.amount),
            };
          })
        : [],
      salesForecast: Array.isArray(fp.salesForecast)
        ? fp.salesForecast.slice(0, 100).map((r, idx) => {
            const row = (r ?? {}) as Record<string, unknown>;
            return {
              id: cleanStr(row.id, 64) || `sale-${idx + 1}`,
              productOrServiceName: cleanStr(row.productOrServiceName, 300),
              monthlyQuantity: cleanNum(row.monthlyQuantity),
              sellingPricePerUnit: cleanNum(row.sellingPricePerUnit),
              unitVariableCost: cleanNum(row.unitVariableCost),
            };
          })
        : [],
      operatingExpenses: Array.isArray(fp.operatingExpenses)
        ? fp.operatingExpenses.slice(0, 100).map((r, idx) => {
            const row = (r ?? {}) as Record<string, unknown>;
            return {
              id: cleanStr(row.id, 64) || `opex-${idx + 1}`,
              description: cleanStr(row.description, 300),
              costBehavior: row.costBehavior === "VARIABLE" ? "VARIABLE" : "FIXED",
              monthlyAmount: cleanNum(row.monthlyAmount),
            };
          })
        : [],
      monthlyNonOperatingExpense: cleanNum(fp.monthlyNonOperatingExpense),
      estimatedMonthlyTaxExpense: cleanNum(fp.estimatedMonthlyTaxExpense),
      estimatedMonthlyDepreciation: cleanNum(fp.estimatedMonthlyDepreciation),
      financialAssumptions: cleanStr(fp.financialAssumptions),
    },
    taxConsiderations: {
      checkedItemIds: Array.isArray(tx.checkedItemIds)
        ? tx.checkedItemIds.filter((id): id is string => typeof id === "string").slice(0, 30)
        : [],
      chosenStructureNotes: cleanStr(tx.chosenStructureNotes),
      regulatoryComplianceNotes: cleanStr(tx.regulatoryComplianceNotes),
    },
    riskFeasibility: {
      marketRisks: cleanStr(rf.marketRisks),
      financialRisks: cleanStr(rf.financialRisks),
      operationalRisks: cleanStr(rf.operationalRisks),
      staffingRisks: cleanStr(rf.staffingRisks),
      regulatoryRisks: cleanStr(rf.regulatoryRisks),
      mitigationStrategies: cleanStr(rf.mitigationStrategies),
      feasibilityChecklist: {
        marketDemandVerified: Boolean(fc.marketDemandVerified),
        operationalCapacityRealistic: Boolean(fc.operationalCapacityRealistic),
        capitalRequirementsAchievable: Boolean(fc.capitalRequirementsAchievable),
        projectedProfitabilityPositive: Boolean(fc.projectedProfitabilityPositive),
      },
      feasibilityConclusionStatus:
        rf.feasibilityConclusionStatus === "FEASIBLE_WITH_CONDITIONS" ||
        rf.feasibilityConclusionStatus === "NEEDS_REVISION"
          ? rf.feasibilityConclusionStatus
          : "UNREVIEWED",
      feasibilityStudentConclusion: cleanStr(rf.feasibilityStudentConclusion),
    },
    conclusionAppendices: {
      businessConclusion: cleanStr(ca.businessConclusion),
      implementationTimeline: Array.isArray(ca.implementationTimeline)
        ? ca.implementationTimeline.slice(0, 50).map((m, idx) => {
            const row = (m ?? {}) as Record<string, unknown>;
            return {
              id: cleanStr(row.id, 64) || `time-${idx + 1}`,
              phase: cleanStr(row.phase, 200),
              targetPeriod: cleanStr(row.targetPeriod, 150),
              responsiblePerson: cleanStr(row.responsiblePerson, 200),
              deliverable: cleanStr(row.deliverable, 500),
            };
          })
        : [],
      supportingResearch: cleanStr(ca.supportingResearch),
      surveySummaries: cleanStr(ca.surveySummaries),
      supplierQuotations: Array.isArray(ca.supplierQuotations)
        ? ca.supplierQuotations.slice(0, 50).map((q, idx) => {
            const row = (q ?? {}) as Record<string, unknown>;
            return {
              id: cleanStr(row.id, 64) || `quote-${idx + 1}`,
              supplierName: cleanStr(row.supplierName, 200),
              itemDescription: cleanStr(row.itemDescription, 300),
              quotedAmount: cleanNum(row.quotedAmount),
              notes: cleanStr(row.notes, 300),
            };
          })
        : [],
      additionalAppendices: cleanStr(ca.additionalAppendices),
    },
  };
}

export interface RawBusinessPlanRow {
  id: string;
  studentId: string;
  instituteId: string;
  title: string;
  documentType: string;
  status: string;
  businessCategory: string;
  data: unknown;
  templateId: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toBusinessPlanRecord(row: RawBusinessPlanRow): BusinessPlanRecord {
  const docType: BusinessPlanDocumentType = "BUSINESS_PLAN";
  const status: BusinessPlanStatus = row.status === "COMPLETED" ? "COMPLETED" : "DRAFT";
  const sanitizedData = sanitizeBusinessPlanData(row.data);
  return {
    id: row.id,
    studentId: row.studentId,
    instituteId: row.instituteId,
    title: row.title || sanitizedData.businessInfo.businessName || "Untitled Business Plan",
    documentType: docType,
    status,
    businessCategory: sanitizedData.businessInfo.businessCategory,
    data: sanitizedData,
    templateId: row.templateId,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toBusinessPlanSummary(row: RawBusinessPlanRow): BusinessPlanSummary {
  const record = toBusinessPlanRecord(row);
  const validation = validateBusinessPlan(record.data);
  return {
    id: record.id,
    title: record.title,
    documentType: record.documentType,
    status: record.status,
    businessCategory: record.businessCategory,
    businessName: record.data.businessInfo.businessName,
    completionPercentage: validation.completionPercentage,
    completedStepCount: validation.completedSteps,
    totalSteps: validation.totalSteps,
    templateId: record.templateId,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
