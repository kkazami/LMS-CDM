export type BusinessPlanDocumentType = "BUSINESS_PLAN";

export type BusinessCategory =
  | "FOOD_BEVERAGE"
  | "RETAIL"
  | "ONLINE_COMMERCE"
  | "SERVICES"
  | "HOSPITALITY_TOURISM"
  | "MANUFACTURING_PRODUCTION"
  | "CAMPUS_ENTERPRISE";

export type BusinessOwnershipType =
  | "SOLE_PROPRIETORSHIP"
  | "PARTNERSHIP"
  | "CORPORATION"
  | "ONE_PERSON_CORPORATION"
  | "COOPERATIVE";

export type BusinessPlanStatus = "DRAFT" | "COMPLETED";

export type SectionValidationStatus =
  | "INCOMPLETE"
  | "INVALID"
  | "READY_FOR_REVIEW"
  | "COMPLETED";

export interface CompetitorRow {
  id: string;
  name: string;
  priceRange: string;
  strengths: string;
  weaknesses: string;
}

export interface StaffingRow {
  id: string;
  roleTitle: string;
  headcount: number;
  monthlyCompensation: number;
  responsibilities: string;
}

export type StartupCostCategory = "CAPEX" | "PRE_OPERATING" | "WORKING_CAPITAL";

export interface StartupCostRow {
  id: string;
  description: string;
  category: StartupCostCategory;
  amount: number;
}

export type FundingSourceType = "OWNER_EQUITY" | "FAMILY_GRANT" | "LOAN";

export interface FundingSourceRow {
  id: string;
  description: string;
  sourceType: FundingSourceType;
  amount: number;
}

export interface SalesForecastRow {
  id: string;
  productOrServiceName: string;
  monthlyQuantity: number;
  sellingPricePerUnit: number;
  unitVariableCost: number;
}

export type CostBehavior = "FIXED" | "VARIABLE";

export interface OperatingExpenseRow {
  id: string;
  description: string;
  costBehavior: CostBehavior;
  monthlyAmount: number;
}

export interface TimelineMilestoneRow {
  id: string;
  phase: string;
  targetPeriod: string;
  responsiblePerson: string;
  deliverable: string;
}

export interface SupplierQuotationRow {
  id: string;
  supplierName: string;
  itemDescription: string;
  quotedAmount: number;
  notes: string;
}

export interface BusinessPlanData {
  documentSetup: {
    documentType: BusinessPlanDocumentType;
    targetAudience: string;
    documentTitle: string;
    studentNames: string;
    schoolOrProgram: string;
    courseAndSection: string;
    instructorName: string;
    submissionDate: string;
  };
  businessInfo: {
    businessName: string;
    businessCategory: BusinessCategory;
    description: string;
    location: string;
    ownershipType: BusinessOwnershipType;
    mission: string;
    vision: string;
    objectives: string;
    productsOrServices: string;
    problemSolved: string;
  };
  executiveSummary: {
    businessConcept: string;
    targetMarketSummary: string;
    productsServicesSummary: string;
    competitiveAdvantage: string;
    financialOverview: string;
    businessObjectivesSummary: string;
  };
  marketAnalysis: {
    targetCustomers: string;
    customerNeeds: string;
    marketResearchFindings: string;
    surveyResultsSummary: string;
    competitors: CompetitorRow[];
    marketOpportunities: string;
    swotStrengths: string;
    swotWeaknesses: string;
    swotOpportunities: string;
    swotThreats: string;
  };
  marketingSalesPlan: {
    productServiceStrategy: string;
    pricingStrategy: string;
    promotionAdvertising: string;
    distributionDelivery: string;
    salesChannels: string;
    customerAcquisition: string;
    customerRetention: string;
  };
  operationalPlan: {
    businessLocation: string;
    equipmentAndSupplies: string;
    materialsAndSuppliers: string;
    productionOrServiceProcess: string;
    inventoryRequirements: string;
    operatingSchedule: string;
    estimatedOperatingCapacity: string;
    qualityControl: string;
    categorySpecificNotes: string;
  };
  managementHrPlan: {
    organizationalStructure: string;
    ownershipManagementRoles: string;
    staffingRequirements: StaffingRow[];
    jobDescriptions: string;
    employeeResponsibilities: string;
    recruitmentSelectionApproach: string;
    employeeTraining: string;
    workplacePolicies: string;
  };
  financialPlan: {
    startupCosts: StartupCostRow[];
    fundingSources: FundingSourceRow[];
    salesForecast: SalesForecastRow[];
    operatingExpenses: OperatingExpenseRow[];
    monthlyNonOperatingExpense: number;
    estimatedMonthlyTaxExpense: number;
    estimatedMonthlyDepreciation: number;
    financialAssumptions: string;
  };
  taxConsiderations: {
    checkedItemIds: string[];
    chosenStructureNotes: string;
    regulatoryComplianceNotes: string;
  };
  riskFeasibility: {
    marketRisks: string;
    financialRisks: string;
    operationalRisks: string;
    staffingRisks: string;
    regulatoryRisks: string;
    mitigationStrategies: string;
    feasibilityChecklist: {
      marketDemandVerified: boolean;
      operationalCapacityRealistic: boolean;
      capitalRequirementsAchievable: boolean;
      projectedProfitabilityPositive: boolean;
    };
    feasibilityConclusionStatus:
      | "UNREVIEWED"
      | "FEASIBLE_WITH_CONDITIONS"
      | "NEEDS_REVISION";
    feasibilityStudentConclusion: string;
  };
  conclusionAppendices: {
    businessConclusion: string;
    implementationTimeline: TimelineMilestoneRow[];
    supportingResearch: string;
    surveySummaries: string;
    supplierQuotations: SupplierQuotationRow[];
    additionalAppendices: string;
  };
}

export interface SalesItemCalculationResult {
  id: string;
  name: string;
  monthlyQuantity: number;
  sellingPricePerUnit: number;
  unitVariableCost: number;
  unitContributionMargin: number;
  monthlyRevenue: number;
  monthlyCogs: number;
  monthlyGrossProfit: number;
}

export interface BreakEvenCalculationResult {
  isCalculable: boolean;
  fixedCostsMonthly: number;
  weightedSellingPricePerUnit: number;
  weightedVariableCostPerUnit: number;
  weightedContributionMarginPerUnit: number;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  explanation: string;
}

export interface FinancialWarning {
  code: string;
  severity: "WARNING" | "ERROR";
  message: string;
}

export interface FinancialPlanCalculationResult {
  startupCapexTotal: number;
  startupPreOperatingTotal: number;
  startupWorkingCapitalReserve: number;
  totalStartupCosts: number;

  ownerEquityTotal: number;
  grantsAndLoansTotal: number;
  totalFundingSources: number;
  fundingSurplusOrGap: number;

  salesItemResults: SalesItemCalculationResult[];
  totalMonthlyUnits: number;
  monthlySalesRevenue: number;
  annualSalesRevenue: number;
  monthlyCogs: number;
  annualCogs: number;
  monthlyGrossProfit: number;
  annualGrossProfit: number;
  grossMarginPercent: number;

  monthlyFixedOperatingExpenses: number;
  monthlyVariableOperatingExpenses: number;
  monthlyOperatingExpenses: number;
  annualOperatingExpenses: number;

  monthlyOperatingProfit: number;
  annualOperatingProfit: number;
  monthlyNonOperatingAndTax: number;
  annualNonOperatingAndTax: number;
  monthlyNetProfit: number;
  annualNetProfit: number;
  netMarginPercent: number;

  openingCashBalance: number;
  monthlyOperatingCashFlow: number;
  projectedFirstMonthEndingCash: number;
  projectedYearOneEndingCash: number;

  breakEven: BreakEvenCalculationResult;
  warnings: FinancialWarning[];
}

export type StepKey =
  | "documentSetup"
  | "businessInfo"
  | "executiveSummary"
  | "marketAnalysis"
  | "marketingSalesPlan"
  | "operationalPlan"
  | "managementHrPlan"
  | "financialPlan"
  | "taxConsiderations"
  | "riskFeasibility"
  | "conclusionAppendices";

export interface StepValidationResult {
  stepNumber: number;
  key: StepKey;
  title: string;
  shortTitle: string;
  status: SectionValidationStatus;
  missingFields: string[];
  warnings: string[];
  errors: string[];
}

export interface BusinessPlanValidationResult {
  steps: StepValidationResult[];
  completedSteps: number;
  totalSteps: number;
  completionPercentage: number;
  isReadyForCompletion: boolean;
}

export interface BusinessPlanRecord {
  id: string;
  studentId: string;
  instituteId: string;
  title: string;
  documentType: BusinessPlanDocumentType;
  status: BusinessPlanStatus;
  businessCategory: BusinessCategory;
  data: BusinessPlanData;
  templateId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessPlanSummary {
  id: string;
  title: string;
  documentType: BusinessPlanDocumentType;
  status: BusinessPlanStatus;
  businessCategory: BusinessCategory;
  businessName: string;
  completionPercentage: number;
  completedStepCount: number;
  totalSteps: number;
  templateId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
