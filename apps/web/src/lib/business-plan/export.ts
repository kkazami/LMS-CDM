// The document compiler is also imported by the browser preview.
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
import { calculateFinancialPlan, formatPhpCurrency } from "./calculator";
import { TAX_AND_REGISTRATION_CHECKLIST } from "./learning-center";
import type {
  BusinessCategory,
  BusinessOwnershipType,
  BusinessPlanRecord,
} from "./types";

export interface ExportTable {
  title: string;
  headers: string[];
  align?: ("left" | "right" | "center")[];
  rows: string[][];
  footer?: string[][];
}

export interface ExportSubsection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  tables?: ExportTable[];
}

export interface ExportSection {
  number: string;
  title: string;
  summaryNote?: string;
  subsections: ExportSubsection[];
}

export interface CompiledBusinessDocument {
  title: string;
  subtitle: string;
  documentTypeLabel: string;
  businessName: string;
  categoryLabel: string;
  ownershipLabel: string;
  location: string;
  preparedBy: string;
  schoolOrProgram: string;
  courseAndSection: string;
  instructorName: string;
  submissionDate: string;
  statusLabel: string;
  isIllustrativeTemplate: boolean;
  toc: { number: string; title: string }[];
  sections: ExportSection[];
}

const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  FOOD_BEVERAGE: "Food & Beverage / Hospitality",
  RETAIL: "Retail & Merchandising",
  ONLINE_COMMERCE: "Online Selling / E-Commerce",
  SERVICES: "Professional & Personal Services",
  HOSPITALITY_TOURISM: "Hospitality, Catering & Tourism",
  MANUFACTURING_PRODUCTION: "Light Manufacturing & Production",
  CAMPUS_ENTERPRISE: "Campus / Student-Run Enterprise",
};

const OWNERSHIP_LABELS: Record<BusinessOwnershipType, string> = {
  SOLE_PROPRIETORSHIP: "Sole Proprietorship (DTI)",
  PARTNERSHIP: "Partnership (SEC)",
  CORPORATION: "Corporation (SEC)",
  ONE_PERSON_CORPORATION: "One Person Corporation (OPC - SEC)",
  COOPERATIVE: "Cooperative (CDA)",
};

function valOrPlaceholder(value: string | undefined, placeholder = "Not yet specified"): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : placeholder;
}

export function buildCompiledBusinessDocument(
  record: BusinessPlanRecord,
  fallbackStudentName = "IBE Student"
): CompiledBusinessDocument {
  const { data } = record;
  const calc = calculateFinancialPlan(data.financialPlan);

  const documentTypeLabel = "Comprehensive Business Plan";
  const businessName = valOrPlaceholder(data.businessInfo.businessName, record.title || "Untitled Venture");
  const preparedBy = valOrPlaceholder(data.documentSetup.studentNames, fallbackStudentName);
  const schoolOrProgram = valOrPlaceholder(
    data.documentSetup.schoolOrProgram,
    "Institute of Business and Entrepreneurship (IBE)"
  );
  const courseAndSection = valOrPlaceholder(data.documentSetup.courseAndSection, "IBE Entrepreneurship / Business Course");
  const instructorName = valOrPlaceholder(data.documentSetup.instructorName, "Course Instructor");
  const submissionDate = valOrPlaceholder(
    data.documentSetup.submissionDate,
    new Date(record.updatedAt || Date.now()).toISOString().slice(0, 10)
  );

  const sections: ExportSection[] = [
    {
      number: "1",
      title: "Executive Summary",
      summaryNote:
        "Synthesis of the business concept, market opportunity, competitive edge, and projected financial performance.",
      subsections: [
        {
          heading: "1.1 Business Concept",
          paragraphs: [valOrPlaceholder(data.executiveSummary.businessConcept)],
        },
        {
          heading: "1.2 Target Market & Products/Services",
          paragraphs: [
            `Target Market: ${valOrPlaceholder(data.executiveSummary.targetMarketSummary)}`,
            `Products & Services: ${valOrPlaceholder(data.executiveSummary.productsServicesSummary)}`,
          ],
        },
        {
          heading: "1.3 Competitive Advantage & Strategic Objectives",
          paragraphs: [
            `Competitive Advantage: ${valOrPlaceholder(data.executiveSummary.competitiveAdvantage)}`,
            `Primary Objectives: ${valOrPlaceholder(data.executiveSummary.businessObjectivesSummary)}`,
          ],
        },
        {
          heading: "1.4 Financial Overview (Projected Estimates)",
          paragraphs: [
            valOrPlaceholder(data.executiveSummary.financialOverview),
            `Key Calculated Estimates: Total Startup Capital Required = ${formatPhpCurrency(calc.totalStartupCosts)}; Projected Monthly Revenue = ${formatPhpCurrency(calc.monthlySalesRevenue)}; Projected Monthly Net Profit = ${formatPhpCurrency(calc.monthlyNetProfit)}.`,
          ],
        },
      ],
    },
    {
      number: "2",
      title: "Company Profile & Business Description",
      subsections: [
        {
          heading: "2.1 Venture Identity & Legal Structure",
          paragraphs: [
            `Proposed Business Name: ${businessName}`,
            `Industry Category: ${CATEGORY_LABELS[data.businessInfo.businessCategory] ?? data.businessInfo.businessCategory}`,
            `Ownership Structure: ${OWNERSHIP_LABELS[data.businessInfo.ownershipType] ?? data.businessInfo.ownershipType}`,
            `Proposed Location: ${valOrPlaceholder(data.businessInfo.location)}`,
          ],
        },
        {
          heading: "2.2 Business Description & Problem Statement",
          paragraphs: [
            `Overview: ${valOrPlaceholder(data.businessInfo.description)}`,
            `Problem Solved: ${valOrPlaceholder(data.businessInfo.problemSolved)}`,
            `Products & Services Offered: ${valOrPlaceholder(data.businessInfo.productsOrServices)}`,
          ],
        },
        {
          heading: "2.3 Mission, Vision, and Objectives",
          paragraphs: [
            `Mission Statement: ${valOrPlaceholder(data.businessInfo.mission)}`,
            `Vision Statement: ${valOrPlaceholder(data.businessInfo.vision)}`,
            `Business Objectives: ${valOrPlaceholder(data.businessInfo.objectives)}`,
          ],
        },
      ],
    },
    {
      number: "3",
      title: "Market Analysis & Industry Research",
      summaryNote:
        "Note: Student market data and survey summaries below represent student-collected research or clearly labeled illustrative estimates.",
      subsections: [
        {
          heading: "3.1 Target Customers & Customer Needs",
          paragraphs: [
            `Target Customers: ${valOrPlaceholder(data.marketAnalysis.targetCustomers)}`,
            `Core Customer Needs: ${valOrPlaceholder(data.marketAnalysis.customerNeeds)}`,
          ],
        },
        {
          heading: "3.2 Market Research & Survey Findings",
          paragraphs: [
            `Market Research Findings: ${valOrPlaceholder(data.marketAnalysis.marketResearchFindings)}`,
            `Survey / Interview Summary: ${valOrPlaceholder(data.marketAnalysis.surveyResultsSummary)}`,
            `Market Opportunities: ${valOrPlaceholder(data.marketAnalysis.marketOpportunities)}`,
          ],
        },
        {
          heading: "3.3 Competitor Matrix",
          paragraphs: [],
          tables: [
            {
              title: "Direct & Indirect Competitors",
              headers: ["Competitor Name", "Price Range / Positioning", "Strengths", "Weaknesses"],
              align: ["left", "left", "left", "left"],
              rows:
                data.marketAnalysis.competitors.length > 0
                  ? data.marketAnalysis.competitors.map((c) => [
                      valOrPlaceholder(c.name, "Unnamed Competitor"),
                      valOrPlaceholder(c.priceRange, "-"),
                      valOrPlaceholder(c.strengths, "-"),
                      valOrPlaceholder(c.weaknesses, "-"),
                    ])
                  : [["No competitors listed", "-", "-", "-"]],
            },
          ],
        },
        {
          heading: "3.4 SWOT Analysis",
          paragraphs: [],
          tables: [
            {
              title: "SWOT Matrix",
              headers: ["Category", "Analysis Details"],
              align: ["left", "left"],
              rows: [
                ["Strengths (Internal)", valOrPlaceholder(data.marketAnalysis.swotStrengths)],
                ["Weaknesses (Internal)", valOrPlaceholder(data.marketAnalysis.swotWeaknesses)],
                ["Opportunities (External)", valOrPlaceholder(data.marketAnalysis.swotOpportunities)],
                ["Threats (External)", valOrPlaceholder(data.marketAnalysis.swotThreats)],
              ],
            },
          ],
        },
      ],
    },
    {
      number: "4",
      title: "Marketing and Sales Plan",
      subsections: [
        {
          heading: "4.1 Product/Service & Pricing Strategy",
          paragraphs: [
            `Product/Service Strategy: ${valOrPlaceholder(data.marketingSalesPlan.productServiceStrategy)}`,
            `Pricing Strategy: ${valOrPlaceholder(data.marketingSalesPlan.pricingStrategy)}`,
          ],
        },
        {
          heading: "4.2 Promotion, Distribution & Sales Channels",
          paragraphs: [
            `Promotion & Advertising: ${valOrPlaceholder(data.marketingSalesPlan.promotionAdvertising)}`,
            `Distribution / Delivery: ${valOrPlaceholder(data.marketingSalesPlan.distributionDelivery)}`,
            `Sales Channels: ${valOrPlaceholder(data.marketingSalesPlan.salesChannels)}`,
          ],
        },
        {
          heading: "4.3 Customer Acquisition & Retention",
          paragraphs: [
            `Customer Acquisition Plan: ${valOrPlaceholder(data.marketingSalesPlan.customerAcquisition)}`,
            `Customer Retention Plan: ${valOrPlaceholder(data.marketingSalesPlan.customerRetention)}`,
          ],
        },
      ],
    },
    {
      number: "5",
      title: "Operational Plan",
      subsections: [
        {
          heading: "5.1 Facilities, Equipment & Supply Chain",
          paragraphs: [
            `Operational Location & Layout: ${valOrPlaceholder(data.operationalPlan.businessLocation)}`,
            `Equipment & Supplies: ${valOrPlaceholder(data.operationalPlan.equipmentAndSupplies)}`,
            `Materials & Suppliers: ${valOrPlaceholder(data.operationalPlan.materialsAndSuppliers)}`,
          ],
        },
        {
          heading: "5.2 Workflow, Capacity & Quality Control",
          paragraphs: [
            `Production / Service Workflow: ${valOrPlaceholder(data.operationalPlan.productionOrServiceProcess)}`,
            `Inventory Requirements: ${valOrPlaceholder(data.operationalPlan.inventoryRequirements)}`,
            `Operating Schedule: ${valOrPlaceholder(data.operationalPlan.operatingSchedule)}`,
            `Estimated Operating Capacity: ${valOrPlaceholder(data.operationalPlan.estimatedOperatingCapacity)}`,
            `Quality Control Standards: ${valOrPlaceholder(data.operationalPlan.qualityControl)}`,
            ...(data.operationalPlan.categorySpecificNotes.trim()
              ? [`Category-Specific Operational Notes: ${data.operationalPlan.categorySpecificNotes}`]
              : []),
          ],
        },
      ],
    },
    {
      number: "6",
      title: "Management and Human Resources Plan",
      subsections: [
        {
          heading: "6.1 Organizational Structure & Management Roles",
          paragraphs: [
            `Organizational Structure: ${valOrPlaceholder(data.managementHrPlan.organizationalStructure)}`,
            `Ownership & Management Roles: ${valOrPlaceholder(data.managementHrPlan.ownershipManagementRoles)}`,
          ],
        },
        {
          heading: "6.2 Staffing Requirements & Compensation Schedule",
          paragraphs: [],
          tables: [
            {
              title: "Staffing Plan",
              headers: ["Role / Position", "Headcount", "Monthly Pay per Person", "Total Monthly Pay", "Key Responsibilities"],
              align: ["left", "right", "right", "right", "left"],
              rows:
                data.managementHrPlan.staffingRequirements.length > 0
                  ? data.managementHrPlan.staffingRequirements.map((s) => [
                      valOrPlaceholder(s.roleTitle, "Role"),
                      String(s.headcount),
                      formatPhpCurrency(s.monthlyCompensation),
                      formatPhpCurrency(s.headcount * s.monthlyCompensation),
                      valOrPlaceholder(s.responsibilities, "-"),
                    ])
                  : [["No staffing rows recorded", "0", "PHP 0.00", "PHP 0.00", "-"]],
              footer: [
                [
                  "Total Staffing",
                  String(data.managementHrPlan.staffingRequirements.reduce((acc, s) => acc + s.headcount, 0)),
                  "",
                  formatPhpCurrency(
                    data.managementHrPlan.staffingRequirements.reduce(
                      (acc, s) => acc + s.headcount * s.monthlyCompensation,
                      0
                    )
                  ),
                  "",
                ],
              ],
            },
          ],
        },
        {
          heading: "6.3 HR Policies, Recruitment & Training",
          paragraphs: [
            `Job Descriptions: ${valOrPlaceholder(data.managementHrPlan.jobDescriptions)}`,
            `Employee Responsibilities: ${valOrPlaceholder(data.managementHrPlan.employeeResponsibilities)}`,
            `Recruitment & Selection Approach: ${valOrPlaceholder(data.managementHrPlan.recruitmentSelectionApproach)}`,
            `Employee Training & Development: ${valOrPlaceholder(data.managementHrPlan.employeeTraining)}`,
            `Workplace Policies: ${valOrPlaceholder(data.managementHrPlan.workplacePolicies)}`,
          ],
        },
      ],
    },
    {
      number: "7",
      title: "Financial Plan and Projections",
      summaryNote:
        "Disclaimer: All financial figures below are projected educational estimates based on stated assumptions and do not guarantee actual business performance.",
      subsections: [
        {
          heading: "7.1 Startup Capital Requirements & Funding Sources",
          paragraphs: [
            `Accounting Note: Owner contributions and loans (${formatPhpCurrency(calc.totalFundingSources)}) are recorded as capital funding sources on the balance sheet/cash flow, never as sales revenue. Capital equipment (${formatPhpCurrency(calc.startupCapexTotal)}) is separated from recurring monthly operating expenses.`,
          ],
          tables: [
            {
              title: "Table 7A — Startup Costs Breakdown",
              headers: ["Startup Item", "Classification", "Amount (PHP)"],
              align: ["left", "left", "right"],
              rows:
                data.financialPlan.startupCosts.length > 0
                  ? data.financialPlan.startupCosts.map((r) => [
                      valOrPlaceholder(r.description, "Startup Expense"),
                      r.category,
                      formatPhpCurrency(r.amount),
                    ])
                  : [["No startup costs entered", "-", "PHP 0.00"]],
              footer: [
                ["Total Capital Equipment (CAPEX)", "", formatPhpCurrency(calc.startupCapexTotal)],
                ["Total Pre-Operating Setup & Permits", "", formatPhpCurrency(calc.startupPreOperatingTotal)],
                ["Initial Working Capital Reserve", "", formatPhpCurrency(calc.startupWorkingCapitalReserve)],
                ["TOTAL STARTUP COSTS", "", formatPhpCurrency(calc.totalStartupCosts)],
              ],
            },
            {
              title: "Table 7B — Owner Contributions & Funding Sources",
              headers: ["Funding Source Description", "Source Type", "Amount (PHP)"],
              align: ["left", "left", "right"],
              rows:
                data.financialPlan.fundingSources.length > 0
                  ? data.financialPlan.fundingSources.map((r) => [
                      valOrPlaceholder(r.description, "Funding Source"),
                      r.sourceType,
                      formatPhpCurrency(r.amount),
                    ])
                  : [["No funding sources entered", "-", "PHP 0.00"]],
              footer: [
                ["TOTAL FUNDING SOURCES", "", formatPhpCurrency(calc.totalFundingSources)],
                ["Funding Surplus / (Gap vs Startup Costs)", "", formatPhpCurrency(calc.fundingSurplusOrGap)],
              ],
            },
          ],
        },
        {
          heading: "7.2 Monthly Sales Forecast & Cost of Goods Sold (COGS)",
          paragraphs: [
            "Formula: Monthly Sales Revenue = Monthly Quantity Sold x Selling Price per Unit. Direct COGS = Monthly Quantity Sold x Variable Unit Cost.",
          ],
          tables: [
            {
              title: "Table 7C — Product/Service Sales & Direct Cost Schedule",
              headers: [
                "Product / Service",
                "Monthly Qty",
                "Selling Price",
                "Unit Cost (COGS)",
                "Unit Margin",
                "Monthly Revenue",
                "Monthly COGS",
              ],
              align: ["left", "right", "right", "right", "right", "right", "right"],
              rows:
                calc.salesItemResults.length > 0
                  ? calc.salesItemResults.map((r) => [
                      valOrPlaceholder(r.name, "Item"),
                      String(r.monthlyQuantity),
                      formatPhpCurrency(r.sellingPricePerUnit),
                      formatPhpCurrency(r.unitVariableCost),
                      formatPhpCurrency(r.unitContributionMargin),
                      formatPhpCurrency(r.monthlyRevenue),
                      formatPhpCurrency(r.monthlyCogs),
                    ])
                  : [["No sales items entered", "0", "PHP 0.00", "PHP 0.00", "PHP 0.00", "PHP 0.00", "PHP 0.00"]],
              footer: [
                [
                  "MONTHLY TOTALS",
                  String(calc.totalMonthlyUnits),
                  "",
                  "",
                  "",
                  formatPhpCurrency(calc.monthlySalesRevenue),
                  formatPhpCurrency(calc.monthlyCogs),
                ],
              ],
            },
          ],
        },
        {
          heading: "7.3 Monthly Operating Expenses (OPEX)",
          paragraphs: [
            "Recurring monthly operating expenses exclude one-time startup capital expenditures and direct unit COGS to prevent double-counting.",
          ],
          tables: [
            {
              title: "Table 7D — Monthly Operating Expenses",
              headers: ["Expense Description", "Behavior", "Monthly Amount (PHP)"],
              align: ["left", "left", "right"],
              rows:
                data.financialPlan.operatingExpenses.length > 0
                  ? data.financialPlan.operatingExpenses.map((r) => [
                      valOrPlaceholder(r.description, "Operating Expense"),
                      r.costBehavior,
                      formatPhpCurrency(r.monthlyAmount),
                    ])
                  : [["No operating expenses entered", "-", "PHP 0.00"]],
              footer: [
                ["Fixed Monthly Operating Expenses", "", formatPhpCurrency(calc.monthlyFixedOperatingExpenses)],
                ["Variable Monthly Operating Expenses", "", formatPhpCurrency(calc.monthlyVariableOperatingExpenses)],
                ["TOTAL MONTHLY OPERATING EXPENSES", "", formatPhpCurrency(calc.monthlyOperatingExpenses)],
              ],
            },
          ],
        },
        {
          heading: "7.4 Projected Income Statement & Cash Flow Comparison",
          paragraphs: [
            "Formulas: Gross Profit = Sales Revenue - COGS. Operating Profit = Gross Profit - Operating Expenses. Net Profit = Operating Profit - Non-Operating Items & Estimated Taxes.",
            "Cash Flow vs. Accounting Profit Distinction: Accounting Net Profit deducts non-cash equipment depreciation and excludes owner capital injections or CAPEX cash outlays. Ending Cash Balance tracks actual cash inflows and outflows.",
          ],
          tables: [
            {
              title: "Table 7E — Projected Monthly & Year 1 Income Statement",
              headers: ["Line Item", "Monthly Projection", "Year 1 Projection (12 Mos.)"],
              align: ["left", "right", "right"],
              rows: [
                ["Sales Revenue (Qty x Selling Price)", formatPhpCurrency(calc.monthlySalesRevenue), formatPhpCurrency(calc.annualSalesRevenue)],
                ["Less: Cost of Goods Sold (COGS)", formatPhpCurrency(calc.monthlyCogs), formatPhpCurrency(calc.annualCogs)],
                ["GROSS PROFIT (Margins: " + calc.grossMarginPercent.toFixed(1) + "%)", formatPhpCurrency(calc.monthlyGrossProfit), formatPhpCurrency(calc.annualGrossProfit)],
                ["Less: Recurring Operating Expenses (OPEX)", formatPhpCurrency(calc.monthlyOperatingExpenses), formatPhpCurrency(calc.annualOperatingExpenses)],
                ["OPERATING PROFIT (EBIT)", formatPhpCurrency(calc.monthlyOperatingProfit), formatPhpCurrency(calc.annualOperatingProfit)],
                ["Less: Non-Operating Expenses & Estimated Tax Provision", formatPhpCurrency(calc.monthlyNonOperatingAndTax), formatPhpCurrency(calc.annualNonOperatingAndTax)],
              ],
              footer: [
                [
                  `PROJECTED NET PROFIT (Net Margin: ${calc.netMarginPercent.toFixed(1)}%)`,
                  formatPhpCurrency(calc.monthlyNetProfit),
                  formatPhpCurrency(calc.annualNetProfit),
                ],
              ],
            },
            {
              title: "Table 7F — Cash Flow Projection vs. Accounting Profit",
              headers: ["Cash Flow Metric", "Amount (PHP)"],
              align: ["left", "right"],
              rows: [
                ["Total Funding Inflows (Owner Contributions + Grants/Loans)", formatPhpCurrency(calc.totalFundingSources)],
                ["Less: Upfront Startup Cash Outflows (CAPEX + Setup)", formatPhpCurrency(calc.startupCapexTotal + calc.startupPreOperatingTotal)],
                ["Opening Cash Reserve Available on Launch Day", formatPhpCurrency(calc.openingCashBalance)],
                ["Projected Monthly Operating Cash Inflow (Net Profit + Non-Cash Depreciation)", formatPhpCurrency(calc.monthlyOperatingCashFlow)],
                ["Projected Month 1 Ending Cash Balance", formatPhpCurrency(calc.projectedFirstMonthEndingCash)],
              ],
              footer: [
                ["Projected Year 1 Ending Cash Balance", formatPhpCurrency(calc.projectedYearOneEndingCash)],
              ],
            },
          ],
        },
        {
          heading: "7.5 Break-Even Analysis & Financial Assumptions",
          paragraphs: [
            `Break-Even Formula: Fixed Costs / (Selling Price per Unit - Variable Cost per Unit).`,
            `Break-Even Interpretation: ${calc.breakEven.explanation}`,
            `Financial Assumptions: ${valOrPlaceholder(data.financialPlan.financialAssumptions)}`,
          ],
          tables: [
            {
              title: "Table 7G — Break-Even Summary",
              headers: ["Metric", "Calculated Value"],
              align: ["left", "right"],
              rows: [
                ["Monthly Fixed Costs", formatPhpCurrency(calc.monthlyFixedOperatingExpenses)],
                ["Weighted Average Selling Price per Unit", formatPhpCurrency(calc.breakEven.weightedSellingPricePerUnit)],
                ["Weighted Average Variable Cost per Unit", formatPhpCurrency(calc.breakEven.weightedVariableCostPerUnit)],
                ["Weighted Unit Contribution Margin", formatPhpCurrency(calc.breakEven.weightedContributionMarginPerUnit)],
                [
                  "Break-Even Units per Month",
                  calc.breakEven.isCalculable && calc.breakEven.breakEvenUnits !== null
                    ? `${calc.breakEven.breakEvenUnits.toLocaleString("en-PH")} units`
                    : "Not reachable (Zero/Negative Contribution Margin)",
                ],
                [
                  "Break-Even Monthly Sales Revenue",
                  calc.breakEven.isCalculable && calc.breakEven.breakEvenRevenue !== null
                    ? formatPhpCurrency(calc.breakEven.breakEvenRevenue)
                    : "Not reachable",
                ],
              ],
            },
          ],
        },
      ],
    },
    {
      number: "8",
      title: "Philippine Tax and Regulatory Considerations",
      summaryNote:
        "Educational Note: Tax obligations depend on business structure, activities, and current Philippine laws. Consult official BIR, DTI, SEC, and LGU guidelines.",
      subsections: [
        {
          heading: "8.1 Regulatory & Tax Compliance Plan",
          paragraphs: [
            `Chosen Legal Form Notes: ${valOrPlaceholder(data.taxConsiderations.chosenStructureNotes)}`,
            `Compliance Plan & Official References: ${valOrPlaceholder(data.taxConsiderations.regulatoryComplianceNotes)}`,
          ],
          bullets: TAX_AND_REGISTRATION_CHECKLIST.map((item) => {
            const checked = data.taxConsiderations.checkedItemIds.includes(item.id);
            return `[${checked ? "REVIEWED" : "PENDING"}] ${item.title} (${item.agency}) — ${item.officialUrl}`;
          }),
        },
      ],
    },
    {
      number: "9",
      title: "Risk Assessment and Feasibility Evaluation",
      subsections: [
        {
          heading: "9.1 Risk Register & Mitigation Strategies",
          paragraphs: [
            `Market Risks: ${valOrPlaceholder(data.riskFeasibility.marketRisks)}`,
            `Financial Risks: ${valOrPlaceholder(data.riskFeasibility.financialRisks)}`,
            `Operational Risks: ${valOrPlaceholder(data.riskFeasibility.operationalRisks)}`,
            `Staffing Risks: ${valOrPlaceholder(data.riskFeasibility.staffingRisks)}`,
            `Regulatory Risks: ${valOrPlaceholder(data.riskFeasibility.regulatoryRisks)}`,
            `Mitigation Strategies: ${valOrPlaceholder(data.riskFeasibility.mitigationStrategies)}`,
          ],
        },
        {
          heading: "9.2 Four-Pillar Feasibility Review & Student Conclusion",
          paragraphs: [
            `Student Feasibility Status: ${data.riskFeasibility.feasibilityConclusionStatus}`,
            `Feasibility Justification: ${valOrPlaceholder(data.riskFeasibility.feasibilityStudentConclusion)}`,
          ],
          bullets: [
            `[${data.riskFeasibility.feasibilityChecklist.marketDemandVerified ? "YES" : "NO"}] Market Demand Verified`,
            `[${data.riskFeasibility.feasibilityChecklist.operationalCapacityRealistic ? "YES" : "NO"}] Operational Capacity Realistic`,
            `[${data.riskFeasibility.feasibilityChecklist.capitalRequirementsAchievable ? "YES" : "NO"}] Capital Requirements Achievable`,
            `[${data.riskFeasibility.feasibilityChecklist.projectedProfitabilityPositive ? "YES" : "NO"}] Projected Profitability & Break-Even Positive`,
          ],
        },
      ],
    },
    {
      number: "10",
      title: "Conclusion, Implementation Timeline & Appendices",
      subsections: [
        {
          heading: "10.1 Overall Business Conclusion",
          paragraphs: [valOrPlaceholder(data.conclusionAppendices.businessConclusion)],
        },
        {
          heading: "10.2 Implementation Timeline",
          paragraphs: [],
          tables: [
            {
              title: "Implementation Milestones",
              headers: ["Phase / Milestone", "Target Period", "Responsible Lead", "Deliverable / Output"],
              align: ["left", "left", "left", "left"],
              rows:
                data.conclusionAppendices.implementationTimeline.length > 0
                  ? data.conclusionAppendices.implementationTimeline.map((m) => [
                      valOrPlaceholder(m.phase, "Phase"),
                      valOrPlaceholder(m.targetPeriod, "-"),
                      valOrPlaceholder(m.responsiblePerson, "-"),
                      valOrPlaceholder(m.deliverable, "-"),
                    ])
                  : [["No timeline milestones recorded", "-", "-", "-"]],
            },
          ],
        },
        {
          heading: "10.3 Supplier Quotations & Supporting Appendices",
          paragraphs: [
            `Supporting Research: ${valOrPlaceholder(data.conclusionAppendices.supportingResearch)}`,
            `Survey Summaries: ${valOrPlaceholder(data.conclusionAppendices.surveySummaries)}`,
            `Additional Appendices: ${valOrPlaceholder(data.conclusionAppendices.additionalAppendices)}`,
          ],
          tables: [
            {
              title: "Supplier Quotations & Equipment Estimates",
              headers: ["Supplier Name", "Item / Material", "Quoted Price (PHP)", "Notes / Terms"],
              align: ["left", "left", "right", "left"],
              rows:
                data.conclusionAppendices.supplierQuotations.length > 0
                  ? data.conclusionAppendices.supplierQuotations.map((q) => [
                      valOrPlaceholder(q.supplierName, "Supplier"),
                      valOrPlaceholder(q.itemDescription, "-"),
                      formatPhpCurrency(q.quotedAmount),
                      valOrPlaceholder(q.notes, "-"),
                    ])
                  : [["No supplier quotations recorded", "-", "PHP 0.00", "-"]],
            },
          ],
        },
      ],
    },
  ];

  return {
    title: record.title || businessName,
    subtitle: `${documentTypeLabel} — ${businessName}`,
    documentTypeLabel,
    businessName,
    categoryLabel: CATEGORY_LABELS[data.businessInfo.businessCategory] ?? data.businessInfo.businessCategory,
    ownershipLabel: OWNERSHIP_LABELS[data.businessInfo.ownershipType] ?? data.businessInfo.ownershipType,
    location: valOrPlaceholder(data.businessInfo.location),
    preparedBy,
    schoolOrProgram,
    courseAndSection,
    instructorName,
    submissionDate,
    statusLabel: record.status === "COMPLETED" ? "COMPLETED DOCUMENT" : "WORKING DRAFT",
    isIllustrativeTemplate: Boolean(record.templateId),
    toc: sections.map((s) => ({ number: s.number, title: s.title })),
    sections,
  };
}

// ─── PDF 1.4 Generator ──────────────────────────────────────────────────────

const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
];
const BOLD_UPPER = [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611];
const BOLD_LOWER = [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500];

function charWidth(code: number, bold: boolean): number {
  if (code >= 65 && code <= 90 && bold) return BOLD_UPPER[code - 65];
  if (code >= 97 && code <= 122 && bold) return BOLD_LOWER[code - 97];
  if (code >= 32 && code <= 126) return HELV[code - 32];
  return 556;
}

export function toPdfLatin1(text: string): string {
  return text
    .replace(/\u20B1/g, "PHP ")
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u203A/g, ">")
    .replace(/\u2026/g, "...")
    .replace(/\u00D7/g, "x")
    .replace(/\u00F7/g, "/")
    .replace(/\u00A0/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, "?");
}

function textWidth(text: string, size: number, bold = false): number {
  let units = 0;
  for (let i = 0; i < text.length; i += 1) {
    units += charWidth(text.charCodeAt(i), bold);
  }
  return (units * size) / 1000;
}

function wrapText(text: string, maxWidth: number, size: number, bold = false): string[] {
  const clean = toPdfLatin1(text).trim();
  if (!clean) return [""];
  const out: string[] = [];
  let current = "";
  const pushLongWord = (word: string) => {
    let rest = word;
    while (textWidth(rest, size, bold) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && textWidth(rest.slice(0, cut), size, bold) > maxWidth) cut -= 1;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  };
  for (const word of clean.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth) {
      current = candidate;
    } else {
      if (current) out.push(current);
      pushLongWord(word);
    }
  }
  if (current) out.push(current);
  return out;
}

function pdfString(text: string): string {
  let out = "(";
  const latin = toPdfLatin1(text);
  for (let i = 0; i < latin.length; i += 1) {
    const code = latin.charCodeAt(i);
    if (latin[i] === "(" || latin[i] === ")" || latin[i] === "\\") out += `\\${latin[i]}`;
    else if (code > 126) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += latin[i];
  }
  return `${out})`;
}

type Rgb = [number, number, number];
const BLACK: Rgb = [0.1, 0.12, 0.16];
const MUTED: Rgb = [0.38, 0.42, 0.48];
const GOLD_DARK: Rgb = [0.65, 0.42, 0.04];
const NAVY: Rgb = [0.12, 0.24, 0.48];
const HEADER_BG: Rgb = [0.93, 0.95, 0.98];
const ZEBRA_BG: Rgb = [0.975, 0.98, 0.99];

const num = (n: number) => (Math.round(n * 100) / 100).toString();
const rgb = (c: Rgb) => `${num(c[0])} ${num(c[1])} ${num(c[2])}`;

class BusinessPlanPdfWriter {
  readonly W = 595; // A4 Portrait width
  readonly H = 842; // A4 Portrait height
  readonly margin = 44;
  private pages: string[][] = [];
  private page: string[] = [];
  y = 0;

  get left() {
    return this.margin;
  }
  get right() {
    return this.W - this.margin;
  }
  get contentWidth() {
    return this.right - this.left;
  }
  get bottomLimit() {
    return this.H - 54;
  }

  newPage() {
    this.page = [];
    this.pages.push(this.page);
    this.y = this.margin;
  }

  ensure(height: number, onNewPage?: () => void) {
    if (this.pages.length === 0) this.newPage();
    if (this.y + height > this.bottomLimit) {
      this.newPage();
      onNewPage?.();
    }
  }

  text(x: number, baseline: number, str: string, size: number, bold = false, color: Rgb = BLACK) {
    this.page.push(
      `BT /${bold ? "F2" : "F1"} ${num(size)} Tf ${rgb(color)} rg ${num(x)} ${num(this.H - baseline)} Td ${pdfString(str)} Tj ET`
    );
  }

  textRight(xRight: number, baseline: number, str: string, size: number, bold = false, color: Rgb = BLACK) {
    this.text(xRight - textWidth(toPdfLatin1(str), size, bold), baseline, str, size, bold, color);
  }

  textCenter(xCenter: number, baseline: number, str: string, size: number, bold = false, color: Rgb = BLACK) {
    this.text(xCenter - textWidth(toPdfLatin1(str), size, bold) / 2, baseline, str, size, bold, color);
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.5, color: Rgb = BLACK) {
    this.page.push(
      `q ${num(width)} w ${rgb(color)} RG ${num(x1)} ${num(this.H - y1)} m ${num(x2)} ${num(this.H - y2)} l S Q`
    );
  }

  rect(x: number, yTop: number, w: number, h: number, color: Rgb) {
    this.page.push(`q ${rgb(color)} rg ${num(x)} ${num(this.H - yTop - h)} ${num(w)} ${num(h)} re f Q`);
  }

  finish(title: string, footerLeft: string): Buffer {
    const total = this.pages.length;
    this.pages.forEach((content, index) => {
      content.push(
        `q 0.82 0.84 0.88 RG 0.5 w ${num(this.left)} ${num(42)} m ${num(this.right)} ${num(42)} l S Q`
      );
      content.push(
        `BT /F1 8 Tf ${rgb(MUTED)} rg ${num(this.left)} ${num(28)} Td ${pdfString(footerLeft)} Tj ET`
      );
      const pageLabel = `Page ${index + 1} of ${total}`;
      content.push(
        `BT /F1 8 Tf ${rgb(MUTED)} rg ${num(this.right - textWidth(pageLabel, 8))} ${num(28)} Td ${pdfString(pageLabel)} Tj ET`
      );
    });

    const chunks: Buffer[] = [];
    const offsets: number[] = [];
    let length = 0;
    const write = (s: string) => {
      const b = Buffer.from(s, "latin1");
      chunks.push(b);
      length += b.length;
    };
    const object = (id: number, body: string) => {
      offsets[id] = length;
      write(`${id} 0 obj\n${body}\nendobj\n`);
    };

    write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const kids = this.pages.map((_, i) => `${6 + i * 2} 0 R`).join(" ");
    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, `<< /Type /Pages /Kids [${kids}] /Count ${total} >>`);
    object(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    object(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const d = new Date();
    const stamp = `D:${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
    object(5, `<< /Title ${pdfString(title)} /Producer (MP-LMS Business Plan Guide and Builder) /CreationDate (${stamp}) >>`);

    this.pages.forEach((content, i) => {
      const pageId = 6 + i * 2;
      const contentId = pageId + 1;
      const stream = content.join("\n");
      object(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`
      );
      object(contentId, `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    });

    const objectCount = 5 + this.pages.length * 2;
    const xrefAt = length;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= objectCount; id += 1) {
      xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    }
    write(xref);
    write(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
    return Buffer.concat(chunks);
  }
}

function drawPdfTable(pdf: BusinessPlanPdfWriter, table: ExportTable) {
  const fontSize = 8;
  const lineH = 10.5;
  const colCount = table.headers.length;
  const colWidths = table.headers.map((header, idx) => {
    let w = textWidth(toPdfLatin1(header), fontSize, true);
    for (const row of [...table.rows, ...(table.footer ?? [])]) {
      w = Math.max(w, textWidth(toPdfLatin1(row[idx] ?? ""), fontSize, false));
    }
    return Math.min(Math.max(w + 12, 42), 200);
  });
  const sumW = colWidths.reduce((a, b) => a + b, 0);
  const scaled = colWidths.map((w) => (w * pdf.contentWidth) / sumW);
  const cellX = (idx: number) => pdf.left + scaled.slice(0, idx).reduce((a, b) => a + b, 0);

  pdf.ensure(36);
  pdf.y += 4;
  pdf.text(pdf.left, pdf.y + 9, table.title, 9.5, true, NAVY);
  pdf.y += 14;

  const drawHeader = () => {
    const wrapped = table.headers.map((h, i) => wrapText(h, scaled[i] - 8, fontSize, true));
    const h = Math.max(...wrapped.map((lines) => lines.length)) * lineH + 6;
    pdf.rect(pdf.left, pdf.y, pdf.contentWidth, h, HEADER_BG);
    table.headers.forEach((_, i) => {
      const align = table.align?.[i] ?? "left";
      wrapped[i].forEach((line, li) => {
        const base = pdf.y + fontSize + 3 + li * lineH;
        if (align === "right") pdf.textRight(cellX(i) + scaled[i] - 4, base, line, fontSize, true, BLACK);
        else pdf.text(cellX(i) + 4, base, line, fontSize, true, BLACK);
      });
    });
    pdf.y += h;
  };

  drawHeader();

  const drawRow = (cells: string[], opts: { bold?: boolean; zebra?: boolean; topRule?: boolean }) => {
    const wrapped = Array.from({ length: colCount }, (_, i) =>
      wrapText(cells[i] ?? "", scaled[i] - 8, fontSize, Boolean(opts.bold))
    );
    const h = Math.max(...wrapped.map((lines) => lines.length)) * lineH + 6;
    pdf.ensure(h, drawHeader);
    if (opts.zebra) pdf.rect(pdf.left, pdf.y, pdf.contentWidth, h, ZEBRA_BG);
    if (opts.topRule) pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.7, NAVY);
    for (let i = 0; i < colCount; i += 1) {
      const align = table.align?.[i] ?? "left";
      wrapped[i].forEach((line, li) => {
        const base = pdf.y + fontSize + 3 + li * lineH;
        if (align === "right") pdf.textRight(cellX(i) + scaled[i] - 4, base, line, fontSize, Boolean(opts.bold));
        else pdf.text(cellX(i) + 4, base, line, fontSize, Boolean(opts.bold));
      });
    }
    pdf.y += h;
  };

  table.rows.forEach((row, idx) => drawRow(row, { zebra: idx % 2 === 1 }));
  (table.footer ?? []).forEach((row) => drawRow(row, { bold: true, topRule: true }));
  pdf.y += 6;
}

export function renderBusinessPlanPdf(record: BusinessPlanRecord, studentName?: string): Buffer {
  const doc = buildCompiledBusinessDocument(record, studentName);
  const pdf = new BusinessPlanPdfWriter();

  // Page 1: Cover Page & Table of Contents
  pdf.newPage();
  const centerX = pdf.W / 2;

  pdf.rect(pdf.left, pdf.y, pdf.contentWidth, 24, [0.98, 0.95, 0.85]);
  pdf.textCenter(
    centerX,
    pdf.y + 15,
    `INSTITUTE OF BUSINESS AND ENTREPRENEURSHIP (IBE) — ${doc.documentTypeLabel.toUpperCase()}`,
    8.5,
    true,
    GOLD_DARK
  );
  pdf.y += 42;

  const titleLines = wrapText(doc.businessName, pdf.contentWidth - 20, 20, true);
  for (const line of titleLines) {
    pdf.textCenter(centerX, pdf.y + 20, line, 20, true, BLACK);
    pdf.y += 26;
  }

  const subLines = wrapText(doc.title, pdf.contentWidth - 40, 12, false);
  for (const line of subLines) {
    pdf.textCenter(centerX, pdf.y + 12, line, 12, false, NAVY);
    pdf.y += 16;
  }

  pdf.y += 10;
  pdf.line(pdf.left + 40, pdf.y, pdf.right - 40, pdf.y, 1, GOLD_DARK);
  pdf.y += 18;

  const metaRows: [string, string][] = [
    ["Document Type", doc.documentTypeLabel],
    ["Document Status", doc.statusLabel],
    ["Industry Category", doc.categoryLabel],
    ["Legal Ownership Structure", doc.ownershipLabel],
    ["Proposed Location", doc.location],
    ["Prepared By (Student/Group)", doc.preparedBy],
    ["School / Program", doc.schoolOrProgram],
    ["Course & Section", doc.courseAndSection],
    ["Faculty Adviser / Instructor", doc.instructorName],
    ["Date Prepared", doc.submissionDate],
  ];

  for (const [label, value] of metaRows) {
    pdf.ensure(18);
    pdf.text(pdf.left + 24, pdf.y + 11, `${label}:`, 9.5, true, MUTED);
    const valLines = wrapText(value, pdf.contentWidth - 190, 9.5, false);
    valLines.forEach((vLine, idx) => {
      pdf.text(pdf.left + 180, pdf.y + 11 + idx * 12, vLine, 9.5, idx === 0, BLACK);
    });
    pdf.y += Math.max(16, valLines.length * 12 + 4);
  }

  pdf.y += 18;
  pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.7, NAVY);
  pdf.y += 14;

  // Table of Contents on Page 1
  pdf.text(pdf.left, pdf.y + 12, "TABLE OF CONTENTS", 11, true, NAVY);
  pdf.y += 18;
  for (const item of doc.toc) {
    pdf.ensure(15);
    pdf.text(pdf.left + 8, pdf.y + 10, `Section ${item.number}. ${item.title}`, 9.5, false, BLACK);
    pdf.y += 14;
  }

  // Start Content Sections on Page 2+
  pdf.newPage();

  for (const section of doc.sections) {
    pdf.ensure(46);
    pdf.y += 8;
    pdf.rect(pdf.left, pdf.y, pdf.contentWidth, 22, HEADER_BG);
    pdf.text(pdf.left + 8, pdf.y + 15, `SECTION ${section.number}: ${section.title.toUpperCase()}`, 11, true, NAVY);
    pdf.y += 28;

    if (section.summaryNote) {
      const noteLines = wrapText(section.summaryNote, pdf.contentWidth - 12, 8.5, false);
      for (const nLine of noteLines) {
        pdf.ensure(12);
        pdf.text(pdf.left + 6, pdf.y + 9, nLine, 8.5, false, GOLD_DARK);
        pdf.y += 11;
      }
      pdf.y += 4;
    }

    for (const sub of section.subsections) {
      pdf.ensure(26);
      pdf.y += 4;
      pdf.text(pdf.left, pdf.y + 10, sub.heading, 10, true, BLACK);
      pdf.y += 14;

      for (const paragraph of sub.paragraphs) {
        for (const rawLine of paragraph.split(/\r?\n/)) {
          const lines = wrapText(rawLine, pdf.contentWidth - 6, 9, false);
          for (const line of lines) {
            pdf.ensure(13);
            pdf.text(pdf.left + 4, pdf.y + 9.5, line, 9, false, BLACK);
            pdf.y += 12;
          }
          pdf.y += 3;
        }
      }

      if (sub.bullets && sub.bullets.length > 0) {
        for (const bullet of sub.bullets) {
          const lines = wrapText(`- ${bullet}`, pdf.contentWidth - 16, 8.5, false);
          for (const line of lines) {
            pdf.ensure(12);
            pdf.text(pdf.left + 10, pdf.y + 9, line, 8.5, false, BLACK);
            pdf.y += 11.5;
          }
        }
        pdf.y += 4;
      }

      if (sub.tables && sub.tables.length > 0) {
        for (const table of sub.tables) {
          drawPdfTable(pdf, table);
        }
      }
    }
  }

  return pdf.finish(
    `${doc.documentTypeLabel} - ${doc.businessName}`,
    `${doc.businessName} | ${doc.documentTypeLabel} (${doc.statusLabel})`
  );
}

// ─── DOCX (OOXML Word Document) Generator ───────────────────────────────────

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function docxParagraph(text: string, opts?: { bold?: boolean; sizeHalfPt?: number; colorHex?: string; spacingAfter?: number }): string {
  const size = opts?.sizeHalfPt ?? 22; // 11pt default
  const color = opts?.colorHex ?? "1A202C";
  const after = opts?.spacingAfter ?? 120;
  return `<w:p>
    <w:pPr><w:spacing w:after="${after}"/></w:pPr>
    <w:r>
      <w:rPr>
        ${opts?.bold ? "<w:b/>" : ""}
        <w:color w:val="${color}"/>
        <w:sz w:val="${size}"/>
        <w:szCs w:val="${size}"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapeXml(text)}</w:t>
    </w:r>
  </w:p>`;
}

function docxTable(table: ExportTable): string {
  const headerCells = table.headers
    .map(
      (h) => `<w:tc>
        <w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="EBF0F7"/></w:tcPr>
        ${docxParagraph(h, { bold: true, sizeHalfPt: 18, colorHex: "1E3A8A", spacingAfter: 60 })}
      </w:tc>`
    )
    .join("");

  const bodyRows = [...table.rows, ...(table.footer ?? [])]
    .map(
      (row, idx) => `<w:tr>
        ${row
          .map(
            (cell) => `<w:tc>
              ${docxParagraph(cell ?? "", {
                bold: idx >= table.rows.length,
                sizeHalfPt: 18,
                spacingAfter: 60,
              })}
            </w:tc>`
          )
          .join("")}
      </w:tr>`
    )
    .join("");

  return `${docxParagraph(table.title, { bold: true, sizeHalfPt: 20, colorHex: "1E3A8A", spacingAfter: 80 })}
  <w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
        <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
      </w:tblBorders>
    </w:tblPr>
    <w:tr>${headerCells}</w:tr>
    ${bodyRows}
  </w:tbl>
  ${docxParagraph("", { spacingAfter: 100 })}`;
}

export function renderBusinessPlanDocx(record: BusinessPlanRecord, studentName?: string): Buffer {
  const doc = buildCompiledBusinessDocument(record, studentName);
  const bodyParts: string[] = [];

  // Cover Block
  bodyParts.push(
    docxParagraph(`INSTITUTE OF BUSINESS AND ENTREPRENEURSHIP (IBE) — ${doc.documentTypeLabel.toUpperCase()}`, {
      bold: true,
      sizeHalfPt: 20,
      colorHex: "B45309",
      spacingAfter: 160,
    }),
    docxParagraph(doc.businessName, { bold: true, sizeHalfPt: 36, colorHex: "0F172A", spacingAfter: 120 }),
    docxParagraph(doc.title, { bold: true, sizeHalfPt: 24, colorHex: "1E3A8A", spacingAfter: 160 }),
    docxParagraph(`Prepared By: ${doc.preparedBy}`, { sizeHalfPt: 20, spacingAfter: 60 }),
    docxParagraph(`School / Program: ${doc.schoolOrProgram}`, { sizeHalfPt: 20, spacingAfter: 60 }),
    docxParagraph(`Course & Section: ${doc.courseAndSection}`, { sizeHalfPt: 20, spacingAfter: 60 }),
    docxParagraph(`Instructor: ${doc.instructorName}`, { sizeHalfPt: 20, spacingAfter: 60 }),
    docxParagraph(`Submission Date: ${doc.submissionDate} | Status: ${doc.statusLabel}`, {
      sizeHalfPt: 20,
      spacingAfter: 240,
    }),
    docxParagraph("TABLE OF CONTENTS", { bold: true, sizeHalfPt: 24, colorHex: "1E3A8A", spacingAfter: 100 })
  );

  for (const item of doc.toc) {
    bodyParts.push(docxParagraph(`Section ${item.number}. ${item.title}`, { sizeHalfPt: 20, spacingAfter: 60 }));
  }

  // Page Break after Cover + TOC
  bodyParts.push(`<w:p><w:r><w:br w:type="page"/></w:r></w:p>`);

  for (const section of doc.sections) {
    bodyParts.push(
      docxParagraph(`SECTION ${section.number}: ${section.title.toUpperCase()}`, {
        bold: true,
        sizeHalfPt: 26,
        colorHex: "1E3A8A",
        spacingAfter: 120,
      })
    );
    if (section.summaryNote) {
      bodyParts.push(
        docxParagraph(section.summaryNote, {
          bold: false,
          sizeHalfPt: 18,
          colorHex: "B45309",
          spacingAfter: 100,
        })
      );
    }
    for (const sub of section.subsections) {
      bodyParts.push(
        docxParagraph(sub.heading, {
          bold: true,
          sizeHalfPt: 22,
          colorHex: "0F172A",
          spacingAfter: 80,
        })
      );
      for (const p of sub.paragraphs) {
        bodyParts.push(docxParagraph(p, { sizeHalfPt: 20, spacingAfter: 100 }));
      }
      if (sub.bullets) {
        for (const b of sub.bullets) {
          bodyParts.push(docxParagraph(`• ${b}`, { sizeHalfPt: 19, spacingAfter: 60 }));
        }
      }
      if (sub.tables) {
        for (const t of sub.tables) {
          bodyParts.push(docxTable(t));
        }
      }
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join("\n")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zipEntries: { name: string; data: Buffer }[] = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypesXml, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(relsXml, "utf8") },
    { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") },
  ];
  return buildStoredZipBuffer(zipEntries);
}

function buildStoredZipBuffer(entries: { name: string; data: Buffer }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, "utf8");
    const dataBuf = entry.data;
    const crc = crc32(dataBuf) >>> 0;

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract
    localHeader.writeUInt16LE(0, 6); // Flags
    localHeader.writeUInt16LE(0, 8); // Compression method (0 = Store)
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(dataBuf.length, 18); // Compressed size
    localHeader.writeUInt32LE(dataBuf.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // File name length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(localHeader, 30);

    localParts.push(localHeader, dataBuf);

    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0, 8); // Flags
    centralHeader.writeUInt16LE(0, 10); // Compression (0 = Store)
    centralHeader.writeUInt16LE(0, 12); // Mod time
    centralHeader.writeUInt16LE(0, 14); // Mod date
    centralHeader.writeUInt32LE(crc, 16); // CRC-32
    centralHeader.writeUInt32LE(dataBuf.length, 20); // Compressed size
    centralHeader.writeUInt32LE(dataBuf.length, 24); // Uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // File name length
    centralHeader.writeUInt16LE(0, 30); // Extra field length
    centralHeader.writeUInt16LE(0, 32); // File comment length
    centralHeader.writeUInt16LE(0, 34); // Disk number start
    centralHeader.writeUInt16LE(0, 36); // Internal file attributes
    centralHeader.writeUInt16LE(0, 38); // External file attributes
    centralHeader.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(centralHeader, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBuf.length;
  }

  const centralDirSize = centralParts.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central directory signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // Number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10); // Total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12); // Size of central directory
  eocd.writeUInt32LE(offset, 16); // Offset of start of central directory
  eocd.writeUInt16LE(0, 20); // Comment length

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}
