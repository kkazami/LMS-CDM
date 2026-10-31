import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { crc32 } from 'node:zlib';
import {
  isBusinessPlanEligible,
  isSameOriginRequest,
} from "../../apps/web/src/lib/business-plan/eligibility";
import {
  calculateFinancialPlan,
  formatPhpCurrency,
} from "../../apps/web/src/lib/business-plan/calculator";
import {
  BUSINESS_PLAN_ID,
  createEmptyBusinessPlanData,
  sanitizeBusinessPlanData,
  STEP_METADATA,
  toBusinessPlanRecord,
  toBusinessPlanSummary,
  validateBusinessPlan,
} from "../../apps/web/src/lib/business-plan/validation";
import {
  LEARNING_TOPICS,
  SUBJECT_CONNECTIONS,
  TAX_AND_REGISTRATION_CHECKLIST,
} from "../../apps/web/src/lib/business-plan/learning-center";
import {
  BUSINESS_PLAN_TEMPLATES,
  instantiateBusinessPlanTemplate,
} from "../../apps/web/src/lib/business-plan/templates";
import {
  buildCompiledBusinessDocument,
  renderBusinessPlanDocx,
  renderBusinessPlanPdf,
} from "../../apps/web/src/lib/business-plan/export";

describe("MP-LMS Business Plan Guide", () => {
  describe("1. Student-Only Access & Role/Institute Authorization", () => {
    it("allows only active IBE students and rejects instructors, admins, and other institutes", () => {
      assert.equal(
        isBusinessPlanEligible({
          role: "STUDENT",
          isActive: true,
          activationStatus: "ACTIVE",
          institute: { code: "ibe" },
        }),
        true
      );
      assert.equal(
        isBusinessPlanEligible({
          role: "STUDENT",
          isActive: true,
          activationStatus: "ACTIVE",
          institute: { code: "IBE" },
        }),
        true
      );
      // Reject Professor / Instructor
      assert.equal(
        isBusinessPlanEligible({
          role: "PROFESSOR",
          isActive: true,
          activationStatus: "ACTIVE",
          institute: { code: "ibe" },
        }),
        false
      );
      assert.equal(
        isBusinessPlanEligible({
          role: "TEACHER",
          isActive: true,
          activationStatus: "ACTIVE",
          institute: { code: "ibe" },
        }),
        false
      );
      // Reject Admin
      assert.equal(
        isBusinessPlanEligible({
          role: "ADMIN",
          isActive: true,
          activationStatus: "ACTIVE",
          institute: { code: "ibe" },
        }),
        false
      );
      // Reject ICS and ITE students
      assert.equal(
        isBusinessPlanEligible({
          role: "STUDENT",
          isActive: true,
          activationStatus: "ACTIVE",
          institute: { code: "ics" },
        }),
        false
      );
      assert.equal(
        isBusinessPlanEligible({
          role: "STUDENT",
          isActive: true,
          activationStatus: "ACTIVE",
          institute: { code: "ite" },
        }),
        false
      );
      // Reject inactive or pending users
      assert.equal(
        isBusinessPlanEligible({
          role: "STUDENT",
          isActive: false,
          activationStatus: "ACTIVE",
          institute: { code: "ibe" },
        }),
        false
      );
      assert.equal(
        isBusinessPlanEligible({
          role: "STUDENT",
          isActive: true,
          activationStatus: "PENDING",
          institute: { code: "ibe" },
        }),
        false
      );
      assert.equal(isBusinessPlanEligible(null), false);
    });

    it("enforces same-origin protection on state-changing requests and validates record IDs", () => {
      const validGet = new Request("http://localhost:3000/api/business-plan", {
        method: "GET",
        headers: { origin: "https://evil.example.com", host: "localhost:3000" },
      });
      assert.equal(isSameOriginRequest(validGet), true);

      const crossOriginPost = new Request("http://localhost:3000/api/business-plan", {
        method: "POST",
        headers: { origin: "https://evil.example.com", host: "localhost:3000" },
      });
      assert.equal(isSameOriginRequest(crossOriginPost), false);

      const sameOriginPost = new Request("http://localhost:3000/api/business-plan", {
        method: "POST",
        headers: { origin: "http://127.0.0.1:3000", host: "localhost:3000" },
      });
      assert.equal(isSameOriginRequest(sameOriginPost), true);

      assert.equal(BUSINESS_PLAN_ID.test("cm9abc1234567890"), true);
      assert.equal(BUSINESS_PLAN_ID.test("../etc/passwd"), false);
      assert.equal(BUSINESS_PLAN_ID.test("short"), false);
    });
  });

  describe("2. Learning Center & Philippine Tax/Regulatory Content", () => {
    it("provides all 14 required beginner-friendly lessons focused exclusively on Business Plans", () => {
      assert.equal(LEARNING_TOPICS.length, 14);
      LEARNING_TOPICS.forEach((topic, idx) => {
        assert.equal(topic.number, idx + 1);
        assert.ok(topic.title.length > 5);
        assert.ok(topic.beginnerExplanation.length > 40);
        assert.ok(topic.purposeOfSection.length > 20);
        assert.ok(topic.whatToPrepare.length >= 3);
        assert.ok(topic.illustrativeExample.businessName.length > 3);
        assert.ok(topic.illustrativeExample.sampleText.length > 30);
        assert.ok(topic.commonMistakesToAvoid.length >= 2);
        assert.ok(topic.reviewChecklist.length >= 3);
        assert.ok(
          !topic.title.toLowerCase().includes("proposal"),
          `Topic ${topic.number} should not contain 'proposal'`
        );
      });

      assert.equal(SUBJECT_CONNECTIONS.length, 6);

      // Verify BIR and DTI official links
      const urls = TAX_AND_REGISTRATION_CHECKLIST.map((c) => c.officialUrl);
      assert.ok(urls.some((u) => u.includes("bir.gov.ph")));
      assert.ok(urls.some((u) => u.includes("dti.gov.ph")));
    });
  });

  describe("3. Templates & Sample Plans (Explicit Financial Opt-In)", () => {
    it("provides 6 internally consistent sample Business Plan templates and never copies sample financials unless explicitly requested", () => {
      assert.equal(BUSINESS_PLAN_TEMPLATES.length, 6);

      for (const tpl of BUSINESS_PLAN_TEMPLATES) {
        assert.equal(tpl.documentType, "BUSINESS_PLAN");
        const calc = calculateFinancialPlan(tpl.sampleData.financialPlan);
        const val = validateBusinessPlan(tpl.sampleData);
        assert.ok(calc.totalStartupCosts > 0, `Template ${tpl.id} should have positive startup costs`);
        assert.ok(calc.monthlySalesRevenue > 0, `Template ${tpl.id} should have positive revenue`);
        assert.ok(calc.monthlyNetProfit > 0, `Template ${tpl.id} should have positive net profit`);
        assert.equal(calc.breakEven.isCalculable, true);
        assert.equal(val.isReadyForCompletion, true, `Template ${tpl.id} should be fully valid`);
      }

      // Default instantiation (includeSampleFinancials: false) must zero out financial rows
      const structureOnly = instantiateBusinessPlanTemplate("small-food-business", {
        includeSampleFinancials: false,
        studentName: "Juan Dela Cruz",
      });
      assert.ok(structureOnly);
      const blankCalc = calculateFinancialPlan(structureOnly.financialPlan);
      assert.equal(blankCalc.totalStartupCosts, 0);
      assert.equal(blankCalc.monthlySalesRevenue, 0);

      // Explicit opt-in copies sample financials
      const withFinancials = instantiateBusinessPlanTemplate("small-food-business", {
        includeSampleFinancials: true,
        studentName: "Juan Dela Cruz",
      });
      assert.ok(withFinancials);
      const sampleCalc = calculateFinancialPlan(withFinancials.financialPlan);
      assert.equal(sampleCalc.totalStartupCosts, 55000);
      assert.equal(sampleCalc.monthlySalesRevenue, 129600);
    });
  });

  describe("4. Deterministic Financial Calculator & Accounting Rules", () => {
    it("calculates Startup Costs, Sales Revenue, Gross Profit, Operating Profit, Net Profit, Cash Flow, and Break-Even accurately", () => {
      const result = calculateFinancialPlan({
        startupCosts: [
          { id: "s1", description: "Commercial Griddle & Freezer", category: "CAPEX", amount: 30000 },
          { id: "s2", description: "DTI, Barangay & Mayor's Permits", category: "PRE_OPERATING", amount: 5000 },
          { id: "s3", description: "Initial Working Capital Buffer", category: "WORKING_CAPITAL", amount: 15000 },
        ],
        fundingSources: [
          { id: "f1", description: "Founders Equity Contribution", sourceType: "OWNER_EQUITY", amount: 40000 },
          { id: "f2", description: "Family Seed Grant", sourceType: "FAMILY_GRANT", amount: 10000 },
        ],
        salesForecast: [
          {
            id: "p1",
            productOrServiceName: "Signature Rice Bowl",
            monthlyQuantity: 1000,
            sellingPricePerUnit: 80,
            unitVariableCost: 35,
          },
          {
            id: "p2",
            productOrServiceName: "Iced Brewed Tea",
            monthlyQuantity: 500,
            sellingPricePerUnit: 40,
            unitVariableCost: 15,
          },
        ],
        operatingExpenses: [
          { id: "o1", description: "Monthly Stall Rent", costBehavior: "FIXED", monthlyAmount: 10000 },
          { id: "o2", description: "Staff Allowances", costBehavior: "FIXED", monthlyAmount: 12000 },
          { id: "o3", description: "Utilities & LPG", costBehavior: "FIXED", monthlyAmount: 5500 },
          { id: "o4", description: "Social Media Promos", costBehavior: "VARIABLE", monthlyAmount: 1500 },
        ],
        monthlyNonOperatingExpense: 500,
        estimatedMonthlyTaxExpense: 1500,
        estimatedMonthlyDepreciation: 1000,
        financialAssumptions: "Based on 25 operating days per month.",
      });

      // Total Startup Costs = 30,000 + 5,000 + 15,000 = 50,000
      assert.equal(result.startupCapexTotal, 30000);
      assert.equal(result.startupPreOperatingTotal, 5000);
      assert.equal(result.startupWorkingCapitalReserve, 15000);
      assert.equal(result.totalStartupCosts, 50000);

      // Total Funding Sources = 50,000 (Never counted in Sales Revenue!)
      assert.equal(result.totalFundingSources, 50000);
      assert.equal(result.fundingSurplusOrGap, 0);

      // Sales Revenue = (1000 * 80) + (500 * 40) = 80,000 + 20,000 = 100,000
      assert.equal(result.monthlySalesRevenue, 100000);

      // COGS = (1000 * 35) + (500 * 15) = 35,000 + 7,500 = 42,500
      assert.equal(result.monthlyCogs, 42500);

      // Gross Profit = 100,000 - 42,500 = 57,500
      assert.equal(result.monthlyGrossProfit, 57500);

      // Operating Expenses = Fixed (27,500) + Variable (1,500) + Depreciation (1,000) = 30,000
      assert.equal(result.monthlyFixedOperatingExpenses, 28500);
      assert.equal(result.monthlyVariableOperatingExpenses, 1500);
      assert.equal(result.monthlyOperatingExpenses, 30000);

      // Operating Profit = 57,500 - 30,000 = 27,500
      assert.equal(result.monthlyOperatingProfit, 27500);

      // Net Profit = 27,500 - (500 + 1,500) = 25,500
      assert.equal(result.monthlyNonOperatingAndTax, 2000);
      assert.equal(result.monthlyNetProfit, 25500);

      // Cash Flow vs Accounting Profit:
      // Opening Cash = 50,000 funding - (30,000 CAPEX + 5,000 Pre-Op) = 15,000
      // Monthly Operating Cash Flow = 25,500 Net Profit + 1,000 Non-Cash Depreciation = 26,500
      assert.equal(result.openingCashBalance, 15000);
      assert.equal(result.monthlyOperatingCashFlow, 26500);
      assert.equal(result.projectedFirstMonthEndingCash, 41500);

      // Break-Even Analysis
      assert.equal(result.breakEven.isCalculable, true);
      assert.ok((result.breakEven.breakEvenUnits ?? 0) > 0);
      assert.equal(formatPhpCurrency(50000), "PHP 50,000.00");
    });

    it("handles zero and negative contribution margins safely without division by zero", () => {
      const negativeMarginResult = calculateFinancialPlan({
        startupCosts: [{ id: "s1", description: "Setup", category: "PRE_OPERATING", amount: 5000 }],
        fundingSources: [{ id: "f1", description: "Equity", sourceType: "OWNER_EQUITY", amount: 5000 }],
        salesForecast: [
          {
            id: "p1",
            productOrServiceName: "Underpriced Item",
            monthlyQuantity: 100,
            sellingPricePerUnit: 50,
            unitVariableCost: 65, // Selling below variable cost!
          },
        ],
        operatingExpenses: [
          { id: "o1", description: "Rent", costBehavior: "FIXED", monthlyAmount: 8000 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 0,
        estimatedMonthlyDepreciation: 0,
        financialAssumptions: "Test negative margin",
      });

      assert.equal(negativeMarginResult.breakEven.isCalculable, false);
      assert.equal(negativeMarginResult.breakEven.breakEvenUnits, null);
      assert.equal(negativeMarginResult.breakEven.breakEvenRevenue, null);
      assert.ok(
        negativeMarginResult.warnings.some((w) => w.code === "NON_POSITIVE_CONTRIBUTION_MARGIN")
      );

      // Zero selling price / zero units edge case
      const zeroSalesResult = calculateFinancialPlan({
        startupCosts: [],
        fundingSources: [],
        salesForecast: [
          {
            id: "p1",
            productOrServiceName: "Zero Margin Item",
            monthlyQuantity: 100,
            sellingPricePerUnit: 40,
            unitVariableCost: 40, // Zero contribution margin
          },
        ],
        operatingExpenses: [
          { id: "o1", description: "Rent", costBehavior: "FIXED", monthlyAmount: 5000 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 0,
        estimatedMonthlyDepreciation: 0,
        financialAssumptions: "",
      });

      assert.equal(zeroSalesResult.breakEven.isCalculable, false);
      assert.equal(zeroSalesResult.breakEven.breakEvenUnits, null);
    });
  });

  describe("5. Business Plan Setup, Validation & Record Serialization", () => {
    it("sanitizes Business Plan setup details and validates all 11 steps", () => {
      const draftPlan = createEmptyBusinessPlanData("BUSINESS_PLAN");
      assert.equal(STEP_METADATA.length, 11);

      const initialValidation = validateBusinessPlan(draftPlan);
      assert.equal(initialValidation.isReadyForCompletion, false);

      draftPlan.documentSetup.documentType = "BUSINESS_PLAN";
      draftPlan.documentSetup.targetAudience = "Entrepreneurship Panel & Academic Evaluators";
      draftPlan.documentSetup.studentNames = "Maria Santos";
      draftPlan.documentSetup.schoolOrProgram = "Institute of Business and Entrepreneurship (IBE)";

      const sanitized = sanitizeBusinessPlanData(draftPlan, "BUSINESS_PLAN");
      assert.equal(sanitized.documentSetup.documentType, "BUSINESS_PLAN");
      assert.equal(sanitized.documentSetup.studentNames, "Maria Santos");

      const step1Val = validateBusinessPlan(sanitized).steps.find((s) => s.stepNumber === 1);
      assert.equal(step1Val?.status, "COMPLETED");
    });

    it("never auto-labels a business as feasible until the student completes the 4-pillar checklist and writes a conclusion", () => {
      const sample = instantiateBusinessPlanTemplate("small-food-business", {
        includeSampleFinancials: true,
        studentName: "IBE Student",
      })!;
      sample.riskFeasibility.feasibilityConclusionStatus = "UNREVIEWED";
      const valUnreviewed = validateBusinessPlan(sample);
      const step10 = valUnreviewed.steps.find((s) => s.stepNumber === 10);
      assert.equal(step10?.status, "READY_FOR_REVIEW");
      assert.equal(valUnreviewed.isReadyForCompletion, false);
    });
  });

  describe("6. Multi-Page PDF & DOCX Export with Long Text and Many Financial Rows", () => {
    it("generates valid multi-page PDF 1.4 and DOCX files even with 55 financial rows and long descriptions", () => {
      const templateData = instantiateBusinessPlanTemplate("cafe-catering-business", {
        includeSampleFinancials: true,
        studentName: "Angela Villanueva",
      })!;

      // Add 55 operating expense rows and a very long description to stress-test pagination
      for (let i = 1; i <= 55; i += 1) {
        templateData.financialPlan.operatingExpenses.push({
          id: `extra-opex-${i}`,
          description: `Extended Monthly Catering Logistics & Event Support Line Item #${i} with detailed operational breakdown`,
          costBehavior: i % 2 === 0 ? "FIXED" : "VARIABLE",
          monthlyAmount: 250 + i * 10,
        });
      }
      templateData.businessInfo.description =
        "Long paragraph test: ".repeat(60) +
        "End of long business description for pagination verification.";

      const now = new Date();
      const record = toBusinessPlanRecord({
        id: "cm9testbusinessplan001",
        studentId: "student-ibe-001",
        instituteId: "inst-ibe-001",
        title: "Brew & Banquet — Campus Cafe & Catering Business Plan",
        documentType: "BUSINESS_PLAN",
        status: "COMPLETED",
        businessCategory: "HOSPITALITY_TOURISM",
        data: templateData,
        templateId: "cafe-catering-business",
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      const summary = toBusinessPlanSummary({
        id: record.id,
        studentId: record.studentId,
        instituteId: record.instituteId,
        title: record.title,
        documentType: record.documentType,
        status: record.status,
        businessCategory: record.businessCategory,
        data: record.data,
        templateId: record.templateId,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      assert.equal(summary.completionPercentage, 100);

      const compiled = buildCompiledBusinessDocument(record, "Angela Villanueva");
      assert.equal(compiled.sections.length, 10);
      assert.equal(compiled.toc.length, 10);

      // Verify PDF output
      const pdfBuffer = renderBusinessPlanPdf(record, "Angela Villanueva");
      const pdfText = pdfBuffer.toString("latin1");
      assert.ok(pdfText.startsWith("%PDF-1.4"), "Must start with %PDF-1.4 header");
      assert.ok(pdfText.includes("TABLE OF CONTENTS"), "Must include Table of Contents");
      assert.ok(pdfText.includes("SECTION 1:"), "Must include Section 1");
      assert.ok(pdfText.includes("SECTION 7:"), "Must include Section 7 Financial Plan");
      assert.ok(pdfText.includes("Page 1 of "), "Must include page numbering");
      assert.ok(pdfText.trim().endsWith("%%EOF"), "Must end with %%EOF trailer");

      // Verify DOCX output (valid PK ZIP archive containing word/document.xml)
      const docxBuffer = renderBusinessPlanDocx(record, "Angela Villanueva");
      assert.equal(docxBuffer.subarray(0, 2).toString("latin1"), "PK", "DOCX must be a valid PK ZIP archive");
      const docxAscii = docxBuffer.toString("utf8");
      let zipOffset = 0, zipEntries = 0;
      while (docxBuffer.readUInt32LE(zipOffset) === 0x04034b50) {
        const size = docxBuffer.readUInt32LE(zipOffset + 18);
        const start = zipOffset + 30 + docxBuffer.readUInt16LE(zipOffset + 26) + docxBuffer.readUInt16LE(zipOffset + 28);
        assert.equal(docxBuffer.readUInt32LE(zipOffset + 14), crc32(docxBuffer.subarray(start, start + size)) >>> 0, 'Stored DOCX entry checksum matches the independent Node implementation');
        zipOffset = start + size; zipEntries++;
      }
      assert.equal(zipEntries, 3);
      assert.ok(docxAscii.includes("word/document.xml"), "DOCX must contain word/document.xml entry");
      assert.ok(docxAscii.includes("TABLE OF CONTENTS"));
      assert.ok(docxAscii.includes("Brew &amp; Banquet"));
    });
  });

  describe("7. Non-Regression of Existing Student Navigation & Dashboard", () => {
    it("preserves base student navigation links and scopes Business Plan Guide to IBE students", () => {
      const sidebarSource = fs.readFileSync(
        path.join(process.cwd(), "apps/web/src/components/layout/Sidebar.tsx"),
        "utf8"
      );
      assert.ok(sidebarSource.includes('label: "Dashboard"'));
      assert.ok(sidebarSource.includes('label: "My Courses"'));
      assert.ok(sidebarSource.includes('label: "Grades"'));
      assert.ok(sidebarSource.includes('label: "Business Plan Guide"'));
      assert.ok(sidebarSource.includes("`/${instituteCode}/business-plan`"));
      assert.ok(sidebarSource.includes('isStudent && instituteCode.toLowerCase() === "ibe"'));

      const studentDashboardSource = fs.readFileSync(
        path.join(process.cwd(), "apps/web/src/app/(dashboard)/[institute]/students/client.tsx"),
        "utf8"
      );
      assert.ok(studentDashboardSource.includes('label="Business Plan Guide"'));
      assert.ok(!studentDashboardSource.toLowerCase().includes("proposal"));
    });
  });
});
