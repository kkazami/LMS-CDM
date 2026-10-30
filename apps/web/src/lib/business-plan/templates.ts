import type {
  BusinessCategory,
  BusinessPlanData,
  BusinessPlanDocumentType,
} from "./types";

export interface BusinessPlanTemplate {
  id: string;
  name: string;
  tagline: string;
  documentType: BusinessPlanDocumentType;
  category: BusinessCategory;
  illustrativeDisclaimer: string;
  sampleData: BusinessPlanData;
}

export const BUSINESS_PLAN_TEMPLATES: BusinessPlanTemplate[] = [
  {
    id: "small-food-business",
    name: "Small Food Business Plan (Campus Rice Bowl & Brew Kiosk)",
    tagline:
      "Quick-serve hot rice bowls and local barako iced coffee stall near a Philippine college gate.",
    documentType: "BUSINESS_PLAN",
    category: "FOOD_BEVERAGE",
    illustrativeDisclaimer:
      "Illustrative Sample Only — Figures are hypothetical educational examples.",
    sampleData: {
      documentSetup: {
        documentType: "BUSINESS_PLAN",
        targetAudience: "IBE Faculty Evaluation Panel",
        documentTitle: "Kusina Express — Campus Rice Bowl & Iced Brew Business Plan",
        studentNames: "Sample Student Group (Section 3A)",
        schoolOrProgram: "Institute of Business and Entrepreneurship (IBE)",
        courseAndSection: "Section 3A",
        instructorName: "Prof. Maria Clara Santos, MBA",
        submissionDate: "2026-10-29",
      },
      businessInfo: {
        businessName: "Kusina Express Rice Bowls & Brews (Illustrative Sample)",
        businessCategory: "FOOD_BEVERAGE",
        description:
          "Kusina Express is a quick-service campus food stall serving standardized 180g hot Filipino rice toppings (crispy chicken fillet, sisig tofu, garlic beef) and 16oz Batangas barako iced coffee in leak-proof kraft bowls.",
        location: "Stall 4, Student Commercial Arcade, Rodriguez, Rizal (Illustrative)",
        ownershipType: "PARTNERSHIP",
        mission:
          "To serve hygienic, filling, and budget-friendly hot rice meals to college students and commuters within 3 minutes of ordering.",
        vision:
          "To become the top student-operated quick-service food brand in the campus district recognized for speed, food safety, and consistent value.",
        objectives:
          "1) Serve an average of 60 rice bowls and 30 iced coffee drinks per operating day across 24 operating days/month; 2) Maintain a gross profit margin of at least 55%; 3) Recover total startup capital within 3 operating months.",
        productsOrServices:
          "1) Signature Crispy Chicken / Tofu Rice Bowl (PHP 75); 2) Batangas Barako Iced Coffee 16oz (PHP 30).",
        problemSolved:
          "College students with 30-minute class breaks struggle to find hot, sanitary, and affordable meals under PHP 80 without waiting 20+ minutes in crowded queues.",
      },
      executiveSummary: {
        businessConcept:
          "Kusina Express is a general partnership operating a compact 6-sqm food kiosk designed around pre-portioned hot rice bowls and cold-brewed local coffee.",
        targetMarketSummary:
          "Daytime college students, faculty, and staff seeking PHP 75–105 meals during peak lunch (11:00 AM–1:30 PM) and merienda (3:30 PM–5:30 PM) windows.",
        productsServicesSummary:
          "Standardized hot rice bowls (PHP 75) and 16oz Barako Iced Coffee (PHP 30) available for counter walk-in and Messenger pre-order pickup.",
        competitiveAdvantage:
          "Under-3-minute serving guarantee, gram-weighed portion consistency, cashless GCash/QRPh acceptance, and a dedicated pre-order express lane.",
        financialOverview:
          "Requires PHP 55,000 in Total Startup Costs funded by PHP 60,000 in partner equity. Projected Monthly Sales Revenue is PHP 129,600 with Monthly COGS of PHP 56,160, Gross Profit of PHP 73,440, Monthly Operating Expenses of PHP 34,200, and Monthly Net Profit of PHP 37,740.",
        businessObjectivesSummary:
          "Achieve monthly break-even at 790 combined units and maintain positive operating cash flow from Month 1.",
      },
      marketAnalysis: {
        targetCustomers:
          "College students aged 18–23 with a daily meal allowance of PHP 80–120 who prioritize fast service and filling rice portions.",
        customerNeeds:
          "Fast turnaround between classes, clean food preparation, affordable combo pricing, and reliable digital payment options.",
        marketResearchFindings:
          "[ILLUSTRATIVE CLASSROOM EXERCISE DATA] Foot-traffic observation near the campus gate showed 400+ students exiting for lunch between 11:30 AM and 1:00 PM.",
        surveyResultsSummary:
          "[ILLUSTRATIVE SAMPLE SURVEY] In a sample classroom survey of 45 students, 36 respondents preferred pre-ordering lunch via Messenger to avoid noon queues.",
        competitors: [
          {
            id: "comp-1",
            name: "Roadside Carinderia Stalls (Illustrative)",
            priceRange: "PHP 65 – PHP 85",
            strengths: "Home-cooked variety; familiar neighborhood presence",
            weaknesses: "15–20 minute queue at noon; inconsistent portion sizes",
          },
          {
            id: "comp-2",
            name: "24/7 Convenience Store Chains (Illustrative)",
            priceRange: "PHP 89 – PHP 125",
            strengths: "Air-conditioned seating; accepts e-wallets",
            weaknesses: "Higher price point; microwaved frozen meals",
          },
        ],
        marketOpportunities:
          "Expanding into pre-packed PHP 85 meal boxes for student organization general assemblies and academic seminars.",
        swotStrengths: "Fast 3-minute bowl assembly, standardized recipe costing, and low stall overhead.",
        swotWeaknesses: "Limited seating capacity (takeout-focused stall) and new brand recognition.",
        swotOpportunities: "High student foot traffic and strong demand for org event bulk meal orders.",
        swotThreats: "Fluctuations in poultry/rice wholesale prices and semester break lulls.",
      },
      marketingSalesPlan: {
        productServiceStrategy:
          "Focus on 3 high-turnover rice bowl flavors and 1 signature iced coffee to keep prep fast and food waste under 2%.",
        pricingStrategy:
          "Cost-plus and bundle pricing: PHP 75 per rice bowl (PHP 34 unit cost) and PHP 30 per iced coffee (PHP 12 unit cost).",
        promotionAdvertising:
          "Campus Facebook page reels, student org loyalty partnerships, and a 10-stamp loyalty card (11th bowl free).",
        distributionDelivery:
          "Counter pickup at the arcade stall plus scheduled campus-gate batch drop-offs at 11:45 AM and 4:00 PM.",
        salesChannels:
          "70% walk-in stall counter sales and 30% Facebook Messenger pre-order form with QRPh payment.",
        customerAcquisition:
          "Opening-week free iced coffee upgrade for the first 30 daily buyers and campus org tasting booths.",
        customerRetention:
          "Digital loyalty stamp card and weekly student-choice sauce specials.",
      },
      operationalPlan: {
        businessLocation:
          "6-sqm commercial food stall with stainless prep counter, handwashing sink, exhaust hood, and dedicated 20A circuit.",
        equipmentAndSupplies:
          "Commercial heavy-duty rice cooker, 2-burner LPG griddle, chest freezer, digital portion scale, and bain-marie food warmer.",
        materialsAndSuppliers:
          "Wholesale poultry, tofu, and 25kg rice sacks sourced from 2 accredited municipal public market suppliers with weekly delivery.",
        productionOrServiceProcess:
          "7:00 AM batch prep & marination -> 10:00 AM cooking & warm holding -> 45-second gram-weighed bowl assembly -> sealed kraft lid handover.",
        inventoryRequirements:
          "3-day chilled protein stock, 7-day dry goods/packaging buffer, and daily FIFO stock card reconciliation.",
        operatingSchedule:
          "Monday to Saturday, 8:00 AM to 6:00 PM (24 operating days per month).",
        estimatedOperatingCapacity:
          "Up to 45 bowls per hour during peak periods (maximum daily capacity of 180 bowls).",
        qualityControl:
          "Digital gram-scale portioning, hairnets/food-grade gloves, temperature log checks every 2 hours, and daily sanitation checklist.",
        categorySpecificNotes:
          "All staff hold valid LGU Health/Sanitary Certificates; used cooking oil is disposed of through accredited collectors.",
      },
      managementHrPlan: {
        organizationalStructure:
          "Flat 3-person partnership: Managing & Finance Partner, Kitchen Operations Partner, and Marketing & Counter Service Partner, assisted by 2 part-time student crew.",
        ownershipManagementRoles:
          "Co-founders contribute equal capital and rotate supervisory shifts; dual approval required for purchases above PHP 3,000.",
        staffingRequirements: [
          {
            id: "st-1",
            roleTitle: "Kitchen & Prep Cook",
            headcount: 1,
            monthlyCompensation: 9000,
            responsibilities: "Morning batch cooking, portion control, and kitchen sanitation.",
          },
          {
            id: "st-2",
            roleTitle: "Counter Cashier & Assembly Crew",
            headcount: 2,
            monthlyCompensation: 4500,
            responsibilities: "Order assembly, QRPh/cash receipting, and Messenger pre-order dispatch.",
          },
        ],
        jobDescriptions:
          "Kitchen Cook requires basic culinary and food-handling training; Counter Crew requires accuracy in cash/e-wallet reconciliation and customer service.",
        employeeResponsibilities:
          "Strict adherence to recipe gram weights, opening/closing sanitation checklists, and daily POS cash turn-over.",
        recruitmentSelectionApproach:
          "Recruit student part-timers via campus job board; screen via a 20-minute practical food-prep and cashiering trial.",
        employeeTraining:
          "2-day onboarding covering food safety (HACCP basics), portioning standards, and customer greeting script.",
        workplacePolicies:
          "Mandatory clean uniform/apron, no mobile phones during food assembly, and 48-hour advance notice for exam-week shift swaps.",
      },
      financialPlan: {
        startupCosts: [
          { id: "sc-1", description: "Commercial Rice Cooker, Griddle, Freezer & Prep Table", category: "CAPEX", amount: 30000 },
          { id: "sc-2", description: "DTI, Barangay, Mayor's Permit & Stall Signage Setup", category: "PRE_OPERATING", amount: 10000 },
          { id: "sc-3", description: "Initial Working Capital & Raw Material Buffer", category: "WORKING_CAPITAL", amount: 15000 },
        ],
        fundingSources: [
          { id: "fs-1", description: "3 Co-Founders Personal Equity Contributions (PHP 20,000 each)", sourceType: "OWNER_EQUITY", amount: 60000 },
        ],
        salesForecast: [
          { id: "sf-1", productOrServiceName: "Signature Rice Bowl (180g)", monthlyQuantity: 1440, sellingPricePerUnit: 75, unitVariableCost: 34 },
          { id: "sf-2", productOrServiceName: "Barako Iced Coffee (16oz)", monthlyQuantity: 720, sellingPricePerUnit: 30, unitVariableCost: 12 },
        ],
        operatingExpenses: [
          { id: "op-1", description: "Monthly Commercial Stall Rent", costBehavior: "FIXED", monthlyAmount: 8500 },
          { id: "op-2", description: "Staff Monthly Compensation & Allowances", costBehavior: "FIXED", monthlyAmount: 18000 },
          { id: "op-3", description: "Electricity, Water & LPG Fuel", costBehavior: "FIXED", monthlyAmount: 4500 },
          { id: "op-4", description: "Campus Social Media & Loyalty Promo Materials", costBehavior: "VARIABLE", monthlyAmount: 2200 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 1500,
        estimatedMonthlyDepreciation: 1000,
        financialAssumptions:
          "Illustrative projection based on 24 operating days/month (60 rice bowls/day at PHP 75 and 30 iced coffees/day at PHP 30). Equipment CAPEX of PHP 30,000 is depreciated straight-line over 30 months (PHP 1,000/month).",
      },
      taxConsiderations: {
        checkedItemIds: ["dti-bnrs", "sec-registration", "barangay-mayors-permit", "bir-cor-2303", "separate-bank-bookkeeping"],
        chosenStructureNotes:
          "Registered as a General Partnership with the SEC, followed by Barangay Clearance, Municipal Mayor's Permit, Sanitary Permit, and BIR Form 2303 registration.",
        regulatoryComplianceNotes:
          "Maintains a dedicated business bank/e-wallet account separate from student personal allowances, issues BIR-registered invoices, and records daily entries in registered books of accounts.",
      },
      riskFeasibility: {
        marketRisks: "Reduced student foot traffic during semestral breaks and typhoon class suspensions.",
        financialRisks: "Seasonal price spikes in poultry, rice, and cooking oil.",
        operationalRisks: "LPG supply interruption or freezer equipment downtime.",
        staffingRisks: "Part-time student crew schedule conflicts during midterm and final exam weeks.",
        regulatoryRisks: "Delays in annual municipal sanitary and fire safety inspection renewals.",
        mitigationStrategies:
          "Maintain 2 accredited meat/produce suppliers, offer non-poultry tofu/egg bowls, cross-train all 3 partners on kitchen stations, and build a 2-month fixed-cost cash reserve.",
        feasibilityChecklist: {
          marketDemandVerified: true,
          operationalCapacityRealistic: true,
          capitalRequirementsAchievable: true,
          projectedProfitabilityPositive: true,
        },
        feasibilityConclusionStatus: "FEASIBLE_WITH_CONDITIONS",
        feasibilityStudentConclusion:
          "Feasible under stated campus foot-traffic assumptions: projected monthly sales (2,160 combined units) comfortably exceed the 790-unit break-even threshold, and partner equity (PHP 60,000) fully covers the PHP 55,000 startup requirement.",
      },
      conclusionAppendices: {
        businessConclusion:
          "Kusina Express addresses a clear daily meal need among college students with a disciplined, low-overhead operational model and transparent unit economics.",
        implementationTimeline: [
          {
            id: "tl-1",
            phase: "Phase 1: Registration & Stall Lease",
            targetPeriod: "Weeks 1–2",
            responsiblePerson: "Managing Partner",
            deliverable: "Signed stall lease, SEC/LGU permits, and BIR registration.",
          },
          {
            id: "tl-2",
            phase: "Phase 2: Equipment Procurement & Recipe Trial",
            targetPeriod: "Week 3",
            responsiblePerson: "Kitchen Partner",
            deliverable: "Installed kitchen equipment and 30-bowl standardized taste test.",
          },
          {
            id: "tl-3",
            phase: "Phase 3: Grand Opening & Operations",
            targetPeriod: "Week 4",
            responsiblePerson: "All Partners",
            deliverable: "Full stall launch and weekly cash-flow tracking.",
          },
        ],
        supportingResearch:
          "Illustrative 3-day campus gate foot-traffic count and menu price comparison table.",
        surveySummaries:
          "Illustrative 45-student lunchtime preference questionnaire summary.",
        supplierQuotations: [
          {
            id: "sq-1",
            supplierName: "Metro Kitchen Depot (Illustrative)",
            itemDescription: "Commercial Rice Cooker, Stainless Prep Table & 7cu.ft Chest Freezer",
            quotedAmount: 30000,
            notes: "Includes 1-year service warranty and delivery.",
          },
        ],
        additionalAppendices: "Floor plan layout (6 sqm) and standard recipe gram-costing sheet.",
      },
    },
  },
  {
    id: "retail-business",
    name: "Retail Business Plan (Campus Academic & Org Supply Store)",
    tagline:
      "Brick-and-mortar and pickup retail shop offering notebooks, accounting ledgers, art materials, and custom lanyards.",
    documentType: "BUSINESS_PLAN",
    category: "RETAIL",
    illustrativeDisclaimer:
      "Illustrative Sample Only — Figures are hypothetical educational examples.",
    sampleData: {
      documentSetup: {
        documentType: "BUSINESS_PLAN",
        targetAudience: "IBE Faculty Review Committee",
        documentTitle: "IskolarSupply — Campus Academic & Merchandising Retail Business Plan",
        studentNames: "Sample Student Group (Section 3B)",
        schoolOrProgram: "Institute of Business and Entrepreneurship (IBE)",
        courseAndSection: "Section 3B",
        instructorName: "Prof. Carlos Mendoza, DBA",
        submissionDate: "2026-10-29",
      },
      businessInfo: {
        businessName: "IskolarSupply Academic & Merch Store (Illustrative Sample)",
        businessCategory: "RETAIL",
        description:
          "IskolarSupply is a retail stationery and campus merchandise shop stocking accounting columnar pads, index cards, blue books, scientific calculators, and custom department lanyards.",
        location: "Unit 2, Ground Floor, Campus View Building (Illustrative)",
        ownershipType: "SOLE_PROPRIETORSHIP",
        mission:
          "To provide college students with complete, affordable course-required supplies right outside campus gates.",
        vision:
          "To be the go-to student retail hub for academic essentials and collegiate merchandise.",
        objectives:
          "1) Achieve PHP 95,000+ in monthly retail sales; 2) Maintain zero stockouts on core accounting and exam supplies; 3) Reach break-even within Month 1.",
        productsOrServices:
          "1) Course Supply Bundles & Accounting Ledgers (PHP 120); 2) Custom Department Lanyards & ID Holders (PHP 85).",
        problemSolved:
          "Students often discover they need specific columnar pads, test booklets, or folders 15 minutes before class and cannot travel 3 km to a mall bookstore.",
      },
      executiveSummary: {
        businessConcept:
          "A neighborhood academic supply and custom org merch retail shop tailored to the exact syllabus requirements of college courses.",
        targetMarketSummary:
          "Over 3,000 enrolled college students needing daily academic consumables and semesterly org merchandise.",
        productsServicesSummary:
          "High-turnover school supplies, accounting ledgers, exam booklets, and custom sublimated lanyards.",
        competitiveAdvantage:
          "Syllabus-aligned bundle packs prepared in consultation with class mayors, wholesale Divisoria/direct-mill sourcing, and 1-minute counter pickup.",
        financialOverview:
          "Total Startup Costs of PHP 48,000 funded by PHP 50,000 owner capital. Projected Monthly Sales Revenue is PHP 104,500 with Monthly Net Profit of PHP 27,800.",
        businessObjectivesSummary:
          "Maintain a 45%+ gross retail margin and turn over core inventory every 21 days.",
      },
      marketAnalysis: {
        targetCustomers:
          "First-to-fourth year college students purchasing required course stationery and department merchandise.",
        customerNeeds:
          "Immediate availability near campus, syllabus-compliant specifications, and student-friendly bundle pricing.",
        marketResearchFindings:
          "[ILLUSTRATIVE DATA] Peak demand surges during the first 3 weeks of each semester and prior to midterm/final exam weeks.",
        surveyResultsSummary:
          "[ILLUSTRATIVE SURVEY] Sample survey of 50 students showed 82% prefer buying pre-bundled accounting/course supply kits at the start of the term.",
        competitors: [
          {
            id: "comp-r1",
            name: "Mall National Bookstore Branch (Illustrative)",
            priceRange: "PHP 25 – PHP 350",
            strengths: "Massive brand selection",
            weaknesses: "Requires a 25-minute jeepney ride from campus",
          },
        ],
        marketOpportunities: "Partnering with student organizations for exclusive pre-order merch drops.",
        swotStrengths: "Prime walking-distance location and direct wholesale supplier pricing.",
        swotWeaknesses: "Compact display floor area.",
        swotOpportunities: "Bulk supply contracts for campus seminars and events.",
        swotThreats: "Seasonal sales dip during vacation months.",
      },
      marketingSalesPlan: {
        productServiceStrategy: "Offer 'Freshman Starter Kits' and 'Accounting Exam Kits' alongside individual items.",
        pricingStrategy: "Keystone retail markup (40%–50% gross margin) with bundle discounts.",
        promotionAdvertising: "Back-to-school poster campaigns, class mayor referral perks, and Facebook catalog updates.",
        distributionDelivery: "In-store retail counter plus classroom building lobby drop-offs for bulk org orders.",
        salesChannels: "80% physical retail store and 20% Messenger reserve-and-pickup.",
        customerAcquisition: "Free ballpen or index card pack with every Starter Kit purchase during Week 1.",
        customerRetention: "Semester textbook/calculator buy-back and trade-in credit.",
      },
      operationalPlan: {
        businessLocation: "12-sqm street-level retail unit with slatwall display racks, glass showcase, and stockroom.",
        equipmentAndSupplies: "Display shelving, glass counter, barcode scanner, cash drawer, and receipt printer.",
        materialsAndSuppliers: "Direct paper mill distributors in Quezon City and custom lanyard sublimation workshop in Marikina.",
        productionOrServiceProcess: "Weekly wholesale restock -> SKU tagging -> shelf merchandising -> POS checkout.",
        inventoryRequirements: "Minimum 2-week safety stock of fast-moving columnar pads, folders, and pens.",
        operatingSchedule: "Monday to Saturday, 7:30 AM to 6:00 PM.",
        estimatedOperatingCapacity: "Up to 250 retail transactions per day.",
        qualityControl: "Inspect paper weight/ruling and lanyard print clarity upon supplier delivery.",
        categorySpecificNotes: "Weekly cycle count of top 20 SKUs to prevent shrinkage.",
      },
      managementHrPlan: {
        organizationalStructure: "Owner-Manager supported by 1 full-time Store Cashier/Merchandiser.",
        ownershipManagementRoles: "Owner handles wholesale purchasing and accounting; Store Associate manages daily sales.",
        staffingRequirements: [
          {
            id: "st-r1",
            roleTitle: "Retail Store Cashier & Merchandiser",
            headcount: 1,
            monthlyCompensation: 10000,
            responsibilities: "Customer checkout, shelf restocking, and daily inventory log.",
          },
        ],
        jobDescriptions: "Requires honesty, basic spreadsheet/POS literacy, and neat shelf organization.",
        employeeResponsibilities: "Opening/closing cash count and SKU stock-card updates.",
        recruitmentSelectionApproach: "Structured interview and 10-minute cash-change & inventory counting test.",
        employeeTraining: "1-day POS and product-catalog orientation.",
        workplacePolicies: "Daily cash drawer reconciliation and zero-tolerance policy for unrecorded stock removals.",
      },
      financialPlan: {
        startupCosts: [
          { id: "sc-r1", description: "Display Racks, Glass Counter & POS Cash Drawer", category: "CAPEX", amount: 15000 },
          { id: "sc-r2", description: "DTI, Barangay, Mayor's Permit & Store Signage", category: "PRE_OPERATING", amount: 8000 },
          { id: "sc-r3", description: "Initial Wholesale Merchandise & Working Capital", category: "WORKING_CAPITAL", amount: 25000 },
        ],
        fundingSources: [
          { id: "fs-r1", description: "Owner Personal Savings & Family Seed Capital", sourceType: "OWNER_EQUITY", amount: 50000 },
        ],
        salesForecast: [
          { id: "sf-r1", productOrServiceName: "Academic & Accounting Supply Bundles", monthlyQuantity: 500, sellingPricePerUnit: 120, unitVariableCost: 68 },
          { id: "sf-r2", productOrServiceName: "Custom Department Lanyards & Merch", monthlyQuantity: 523, sellingPricePerUnit: 85, unitVariableCost: 45 },
        ],
        operatingExpenses: [
          { id: "op-r1", description: "Monthly Storefront Rent", costBehavior: "FIXED", monthlyAmount: 7500 },
          { id: "op-r2", description: "Store Associate Monthly Salary", costBehavior: "FIXED", monthlyAmount: 10000 },
          { id: "op-r3", description: "Electricity & Internet", costBehavior: "FIXED", monthlyAmount: 2200 },
          { id: "op-r4", description: "Eco-Bags, Receipt Paper & Promos", costBehavior: "VARIABLE", monthlyAmount: 1200 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 1000,
        estimatedMonthlyDepreciation: 500,
        financialAssumptions:
          "Illustrative retail projection based on 500 supply bundles and 523 merch items sold monthly across 26 operating days.",
      },
      taxConsiderations: {
        checkedItemIds: ["dti-bnrs", "barangay-mayors-permit", "bir-cor-2303", "separate-bank-bookkeeping"],
        chosenStructureNotes: "Sole Proprietorship registered via DTI BNRS, LGU Business Permit, and BIR Form 2303.",
        regulatoryComplianceNotes: "Issues official BIR sales invoices and maintains registered cash receipts and disbursement books.",
      },
      riskFeasibility: {
        marketRisks: "Lower retail volume during inter-semester breaks.",
        financialRisks: "Slow-moving seasonal merchandise tying up cash.",
        operationalRisks: "Supplier delivery delays during peak August/January opening weeks.",
        staffingRisks: "Cashier absence during peak exam weeks.",
        regulatoryRisks: "Annual permit renewal deadlines.",
        mitigationStrategies: "Place wholesale orders 3 weeks before semester opening and keep 70% of inventory in non-perishable staple supplies.",
        feasibilityChecklist: {
          marketDemandVerified: true,
          operationalCapacityRealistic: true,
          capitalRequirementsAchievable: true,
          projectedProfitabilityPositive: true,
        },
        feasibilityConclusionStatus: "FEASIBLE_WITH_CONDITIONS",
        feasibilityStudentConclusion: "Feasible with strong unit margins (45%+) and low fixed overhead.",
      },
      conclusionAppendices: {
        businessConclusion: "IskolarSupply provides high-demand academic necessities with fast inventory turnover and sustainable profitability.",
        implementationTimeline: [
          { id: "tl-r1", phase: "Phase 1: DTI & Store Setup", targetPeriod: "Weeks 1–2", responsiblePerson: "Owner", deliverable: "Permits and shelving installed" },
          { id: "tl-r2", phase: "Phase 2: Wholesale Stocking & Launch", targetPeriod: "Weeks 3–4", responsiblePerson: "Owner & Staff", deliverable: "Store opening for new semester" },
        ],
        supportingResearch: "Course syllabus supply checklist across college programs.",
        surveySummaries: "Illustrative 50-student stationery buying survey.",
        supplierQuotations: [
          { id: "sq-r1", supplierName: "Manila Paper & Stationery Wholesale (Illustrative)", itemDescription: "Initial Bulk Stationery & Columnar Pad Order", quotedAmount: 20000, notes: "Wholesale tier discount applied" },
        ],
        additionalAppendices: "Store shelf planogram and SKU price list.",
      },
    },
  },
  {
    id: "online-selling-business",
    name: "Online Selling Business Plan (Curated Thrift & Campus Tote E-Shop)",
    tagline:
      "Social-commerce apparel and custom canvas tote bag brand operating via TikTok/FB Live and marketplace checkout.",
    documentType: "BUSINESS_PLAN",
    category: "ONLINE_COMMERCE",
    illustrativeDisclaimer:
      "Illustrative Sample Only — Figures are hypothetical educational examples.",
    sampleData: {
      documentSetup: {
        documentType: "BUSINESS_PLAN",
        targetAudience: "IBE Digital Business Faculty",
        documentTitle: "LokalThread — Online Campus Tote & Streetwear Business Plan",
        studentNames: "Sample Student Group (Section 2A)",
        schoolOrProgram: "Institute of Business and Entrepreneurship (IBE)",
        courseAndSection: "Section 2A",
        instructorName: "Prof. Liza Gomez, MBA",
        submissionDate: "2026-10-29",
      },
      businessInfo: {
        businessName: "LokalThread Online Studio (Illustrative Sample)",
        businessCategory: "ONLINE_COMMERCE",
        description:
          "LokalThread is an online social-commerce shop selling heavy-duty zippered canvas laptop totes and curated workwear/casual tops for college students.",
        location: "Home-based fulfillment studio in San Mateo, Rizal + Online Storefronts (Illustrative)",
        ownershipType: "SOLE_PROPRIETORSHIP",
        mission: "To deliver durable, stylish, and budget-friendly everyday bags and campus wear nationwide.",
        vision: "To grow into a trusted student-founded Philippine digital fashion and lifestyle brand.",
        objectives: "1) Ship 400+ orders per month; 2) Keep return/RTO rate below 3%; 3) Achieve 50%+ gross margin.",
        productsOrServices: "1) Heavy-Duty 15-inch Laptop Canvas Tote (PHP 249); 2) Curated Cotton Campus Tee (PHP 199).",
        problemSolved: "Students need sturdy, water-resistant canvas bags that fit 15-inch laptops and folders without costing PHP 1,000+.",
      },
      executiveSummary: {
        businessConcept: "Digital-first apparel and canvas tote brand leveraging live-selling demonstrations and marketplace logistics.",
        targetMarketSummary: "College and senior-high students aged 16–24 shopping on TikTok Shop, Shopee, and Facebook.",
        productsServicesSummary: "Padded canvas laptop totes (PHP 249) and minimalist graphic tees (PHP 199).",
        competitiveAdvantage: "Reinforced stitching with padded laptop compartment demonstrated live on camera and same-day parcel handoff.",
        financialOverview: "Startup capital of PHP 32,000 funded by PHP 35,000 owner equity. Monthly Sales Revenue of PHP 90,650 and Net Profit of PHP 28,250.",
        businessObjectivesSummary: "Break even at 142 units/month and scale weekly live-selling sessions.",
      },
      marketAnalysis: {
        targetCustomers: "Gen-Z online shoppers looking for functional campus bags and everyday casual wear under PHP 250.",
        customerNeeds: "Accurate size measurements, real product videos, fast courier dispatch, and COD/e-wallet options.",
        marketResearchFindings: "[ILLUSTRATIVE DATA] Canvas totes with laptop compartments rank among top student back-to-school searches.",
        surveyResultsSummary: "[ILLUSTRATIVE SURVEY] 38 of 45 surveyed students preferred zippered canvas totes with inner pockets over open totes.",
        competitors: [
          { id: "comp-o1", name: "Generic Overseas Marketplace Sellers (Illustrative)", priceRange: "PHP 120 – PHP 190", strengths: "Low base price", weaknesses: "Thin fabric, no zipper, 7–10 day shipping wait" },
        ],
        marketOpportunities: "Custom silk-screened tote orders for university events and orgs.",
        swotStrengths: "Zero physical storefront rent and high product durability.",
        swotWeaknesses: "Platform commission fees and courier weather delays.",
        swotOpportunities: "Affiliate creator partnerships on TikTok.",
        swotThreats: "Rising marketplace transaction fees.",
      },
      marketingSalesPlan: {
        productServiceStrategy: "Show real weight-load and water-splash tests in short-form videos.",
        pricingStrategy: "Value-based pricing at PHP 249 (tote) and PHP 199 (tee) with free-shipping bundle thresholds.",
        promotionAdvertising: "3x weekly evening Live Selling sessions and micro-student creator seeding.",
        distributionDelivery: "Nationwide courier pickup (J&T / Flash) plus local campus meetup pickup.",
        salesChannels: "TikTok Shop, Shopee, and Facebook/Instagram DM checkout.",
        customerAcquisition: "PHP 20 follow-voucher and back-to-school bundle promos.",
        customerRetention: "Photo-review cashback reward and seasonal design drops.",
      },
      operationalPlan: {
        businessLocation: "10-sqm home studio with garment racks, ring lights, thermal waybill printer, and packing table.",
        equipmentAndSupplies: "Thermal barcode/waybill printer, studio lighting kit, garment steamer, and polymailers.",
        materialsAndSuppliers: "Taytay/Marikina canvas bag sewing subcontractor and direct textile printer.",
        productionOrServiceProcess: "Batch quality inspection -> live catalog shoot -> order packing -> daily 3:00 PM courier pickup.",
        inventoryRequirements: "150 units buffer per core colorway.",
        operatingSchedule: "Daily order processing 9:00 AM–5:00 PM; Live selling Tue/Thu/Sat 7:30 PM–9:30 PM.",
        estimatedOperatingCapacity: "Up to 60 packed parcels per day.",
        qualityControl: "Two-step zipper, seam, and stain check before sealing each polymailer.",
        categorySpecificNotes: "SMS/chat confirmation sent for all COD orders to minimize Return-to-Sender (RTS) parcels.",
      },
      managementHrPlan: {
        organizationalStructure: "Founder (Live Host & Merchandiser) + 1 Part-Time Packing & Chat Support Assistant.",
        ownershipManagementRoles: "Founder manages supplier sourcing, live hosting, and finance; Assistant handles waybills and packing.",
        staffingRequirements: [
          { id: "st-o1", roleTitle: "Order Fulfillment & Chat Assistant (Part-Time)", headcount: 1, monthlyCompensation: 6500, responsibilities: "Waybill printing, QC packing, and customer chat replies." },
        ],
        jobDescriptions: "Detail-oriented student assistant familiar with marketplace seller center tools.",
        employeeResponsibilities: "Zero mis-shipped items and same-day packing cutoff compliance.",
        recruitmentSelectionApproach: "Practical 10-order packing accuracy and chat response test.",
        employeeTraining: "Half-day training on SKU coding and folding/packaging standards.",
        workplacePolicies: "Video recording of high-value parcel packing for courier dispute protection.",
      },
      financialPlan: {
        startupCosts: [
          { id: "sc-o1", description: "Thermal Waybill Printer, Steamer, Racks & Studio Lights", category: "CAPEX", amount: 9000 },
          { id: "sc-o2", description: "DTI & BIR Online Seller Registration + Brand Packaging Setup", category: "PRE_OPERATING", amount: 5000 },
          { id: "sc-o3", description: "Initial 150-Tote & 150-Tee Production Batch", category: "WORKING_CAPITAL", amount: 18000 },
        ],
        fundingSources: [
          { id: "fs-o1", description: "Founder Personal Equity Contribution", sourceType: "OWNER_EQUITY", amount: 35000 },
        ],
        salesForecast: [
          { id: "sf-o1", productOrServiceName: "Heavy-Duty Laptop Canvas Tote", monthlyQuantity: 250, sellingPricePerUnit: 249, unitVariableCost: 115 },
          { id: "sf-o2", productOrServiceName: "Curated Campus Cotton Tee", monthlyQuantity: 143, sellingPricePerUnit: 199, unitVariableCost: 95 },
        ],
        operatingExpenses: [
          { id: "op-o1", description: "Part-Time Fulfillment Assistant Allowance", costBehavior: "FIXED", monthlyAmount: 6500 },
          { id: "op-o2", description: "Fiber Internet & Studio Electricity Share", costBehavior: "FIXED", monthlyAmount: 2500 },
          { id: "op-o3", description: "Social Media Ad Boost & Sample Seeding", costBehavior: "FIXED", monthlyAmount: 3000 },
          { id: "op-o4", description: "Marketplace Transaction Fees & Pouch Supplies", costBehavior: "VARIABLE", monthlyAmount: 6800 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 1000,
        estimatedMonthlyDepreciation: 300,
        financialAssumptions: "Illustrative projection of 393 total parcels/month with marketplace fees modeled in variable OPEX.",
      },
      taxConsiderations: {
        checkedItemIds: ["dti-bnrs", "bir-cor-2303", "separate-bank-bookkeeping"],
        chosenStructureNotes: "Sole Proprietorship registered with DTI and BIR (compliant with e-marketplace seller registration requirements).",
        regulatoryComplianceNotes: "Dedicated business bank account linked to marketplace payouts and official invoice issuance.",
      },
      riskFeasibility: {
        marketRisks: "Changes in social media algorithm reach.",
        financialRisks: "Unclaimed COD Return-to-Sender (RTS) shipping charges.",
        operationalRisks: "Sewing subcontractor lead-time delays.",
        staffingRisks: "Live-selling host voice fatigue or exam schedule conflicts.",
        regulatoryRisks: "E-marketplace withholding tax documentation compliance.",
        mitigationStrategies: "Verify COD buyers via chat before dispatch and maintain 2 sewing workshops.",
        feasibilityChecklist: {
          marketDemandVerified: true,
          operationalCapacityRealistic: true,
          capitalRequirementsAchievable: true,
          projectedProfitabilityPositive: true,
        },
        feasibilityConclusionStatus: "FEASIBLE_WITH_CONDITIONS",
        feasibilityStudentConclusion: "Highly feasible due to low fixed overhead (PHP 12,300/month) and strong unit contribution margins.",
      },
      conclusionAppendices: {
        businessConclusion: "LokalThread demonstrates a low-risk, high-margin digital commerce model ideal for student founders.",
        implementationTimeline: [
          { id: "tl-o1", phase: "Phase 1: Supplier Sampling & Registration", targetPeriod: "Weeks 1–2", responsiblePerson: "Founder", deliverable: "Approved bag samples and DTI/BIR docs" },
          { id: "tl-o2", phase: "Phase 2: Catalog Shoot & First Live Launch", targetPeriod: "Weeks 3–4", responsiblePerson: "Founder & Assistant", deliverable: "First 100 orders shipped" },
        ],
        supportingResearch: "Competitor marketplace price & review benchmark table.",
        surveySummaries: "Illustrative 45-student bag preference survey.",
        supplierQuotations: [
          { id: "sq-o1", supplierName: "Marikina Canvas Craft Workshop (Illustrative)", itemDescription: "150 pcs Heavy Canvas Padded Tote", quotedAmount: 17250, notes: "PHP 115/unit wholesale" },
        ],
        additionalAppendices: "Tote bag technical dimension sheet and live-selling script.",
      },
    },
  },
  {
    id: "service-business",
    name: "Service Business Plan (Campus Print, Bind & Rush Photo Hub)",
    tagline:
      "Fast-turnaround thesis printing, soft/hard binding, lamination, and rush ID photo service center.",
    documentType: "BUSINESS_PLAN",
    category: "SERVICES",
    illustrativeDisclaimer:
      "Illustrative Sample Only — Figures are hypothetical educational examples.",
    sampleData: {
      documentSetup: {
        documentType: "BUSINESS_PLAN",
        targetAudience: "IBE Operations Management Panel",
        documentTitle: "PrintSwift — Academic Printing & Binding Service Business Plan",
        studentNames: "Sample Student Group (Section 3A)",
        schoolOrProgram: "Institute of Business and Entrepreneurship (IBE)",
        courseAndSection: "Section 3A",
        instructorName: "Prof. Elena Cruz, MBA",
        submissionDate: "2026-10-29",
      },
      businessInfo: {
        businessName: "PrintSwift Academic Document Center (Illustrative Sample)",
        businessCategory: "SERVICES",
        description:
          "PrintSwift provides queue-free online file upload printing, thesis ring/soft binding, lamination, and rush 1x1/2x2 ID photo printing for college students.",
        location: "Stall 7, Commercial Strip across Campus Gate (Illustrative)",
        ownershipType: "PARTNERSHIP",
        mission: "To eliminate stressful printing queues by offering upload-ahead document printing and binding.",
        vision: "To be the most reliable academic document and photo service center in the college community.",
        objectives: "1) Process 15,000+ pages and 300+ binding/photo jobs monthly; 2) Guarantee 10-minute pickup for uploaded files.",
        productsOrServices: "1) Document Printing Package (20-page avg job @ PHP 60); 2) Thesis Ring Binding & Rush Photo Package (PHP 150).",
        problemSolved: "Students waste 30–45 minutes waiting in line to transfer files via USB drives plagued by malware.",
      },
      executiveSummary: {
        businessConcept: "A cloud-upload academic printing and binding hub where students send PDFs via form/Messenger and pick up finished printouts between classes.",
        targetMarketSummary: "College students printing research chapters, case studies, practice sets, and OJT dossiers.",
        productsServicesSummary: "Laser/ink-tank color & B/W printing, comb/coil binding, and studio-lit rush ID photos.",
        competitiveAdvantage: "Virus-free cloud upload portal, pre-paid GCash queue priority, and backup continuous-ink printers.",
        financialOverview: "Startup costs of PHP 45,000 funded by PHP 50,000 partner equity. Projected Monthly Revenue of PHP 90,000 and Monthly Net Profit of PHP 33,200.",
        businessObjectivesSummary: "Break even at 322 service jobs per month.",
      },
      marketAnalysis: {
        targetCustomers: "College students, especially 3rd/4th year research and practicum students.",
        customerNeeds: "Crisp print quality, correct margin formatting, fast pickup, and affordable per-page rates.",
        marketResearchFindings: "[ILLUSTRATIVE DATA] Research and capstone courses require 3–5 draft printings per group per semester.",
        surveyResultsSummary: "[ILLUSTRATIVE SURVEY] 42 of 50 surveyed students preferred sending PDFs ahead of time over plugging in flash drives.",
        competitors: [
          { id: "comp-s1", name: "Traditional USB Internet Cafés (Illustrative)", priceRange: "PHP 3 – PHP 10/page", strengths: "Established location", weaknesses: "Slow USB transfer, frequent printer jams, no online pre-order" },
        ],
        marketOpportunities: "Department-wide capstone hardbound thesis batch contracts.",
        swotStrengths: "High-speed duplex ink-tank printers and upload-ahead workflow.",
        swotWeaknesses: "High paper/ink consumption during finals week.",
        swotOpportunities: "Adding tarpaulin and certificate printing for student orgs.",
        swotThreats: "Power outages during daytime school hours.",
      },
      marketingSalesPlan: {
        productServiceStrategy: "Offer 'Upload & Go' express lanes and thesis group discount packages.",
        pricingStrategy: "Tiered per-page pricing plus bundled binding/photo packages.",
        promotionAdvertising: "QR code upload posters on bulletin boards and student council partnerships.",
        distributionDelivery: "Express counter pickup.",
        salesChannels: "Walk-in counter and Messenger/Google Form PDF upload queue.",
        customerAcquisition: "Free plastic folder with every 50+ page research print job.",
        customerRetention: "Thesis Group Loyalty Pass (10% off final defense copies).",
      },
      operationalPlan: {
        businessLocation: "8-sqm service counter with 3 high-speed ink-tank printers, binding machine, and ID photo corner.",
        equipmentAndSupplies: "3 Duplex Ink-Tank Printers, Heavy-Duty Comb Binder, Laminator, DSLR/mirrorless camera + softbox.",
        materialsAndSuppliers: "Wholesale 80gsm bond paper boxes, pigment ink bottles, PVC combs, and photo paper.",
        productionOrServiceProcess: "Customer uploads PDF + GCash receipt -> operator checks margins & prints -> binds/packs -> SMS/chat ready alert.",
        inventoryRequirements: "30 reams of short/A4/long 80gsm paper and 2 complete spare ink sets on hand.",
        operatingSchedule: "Monday to Saturday, 7:00 AM to 6:30 PM.",
        estimatedOperatingCapacity: "Up to 3,500 printed pages and 40 bound manuals per day.",
        qualityControl: "Page-count and margin verification before binding.",
        categorySpecificNotes: "Daily nozzle check and printhead alignment every morning at 6:50 AM.",
      },
      managementHrPlan: {
        organizationalStructure: "2 Co-Founder Partners + 1 Full-Time Print & Binding Technician.",
        ownershipManagementRoles: "Partners handle digital queue management and accounting; Technician runs printers and binding.",
        staffingRequirements: [
          { id: "st-s1", roleTitle: "Print & Binding Operator", headcount: 1, monthlyCompensation: 9500, responsibilities: "Document printing, comb binding, ID photo capture, and printer maintenance." },
        ],
        jobDescriptions: "Proficient in PDF page setup, MS Word/Excel print scaling, and basic photo cropping.",
        employeeResponsibilities: "Zero wasted misprints and timely queue completion.",
        recruitmentSelectionApproach: "15-minute practical PDF booklet printing and comb-binding test.",
        employeeTraining: "Printer maintenance, paper-jam clearing, and color profile training.",
        workplacePolicies: "Strict data privacy: customer uploaded thesis/personal files are deleted every evening.",
      },
      financialPlan: {
        startupCosts: [
          { id: "sc-s1", description: "3 Ink-Tank Duplex Printers, Comb Binder, Laminator & Photo Kit", category: "CAPEX", amount: 28000 },
          { id: "sc-s2", description: "Permits, Counter Setup & Upload Portal Signage", category: "PRE_OPERATING", amount: 7000 },
          { id: "sc-s3", description: "Initial Bulk Paper Reams, Ink & Working Capital", category: "WORKING_CAPITAL", amount: 10000 },
        ],
        fundingSources: [
          { id: "fs-s1", description: "Partners Equity Contributions", sourceType: "OWNER_EQUITY", amount: 50000 },
        ],
        salesForecast: [
          { id: "sf-s1", productOrServiceName: "20-Page Research / Coursework Print Job", monthlyQuantity: 750, sellingPricePerUnit: 60, unitVariableCost: 18 },
          { id: "sf-s2", productOrServiceName: "Thesis Ring Binding & Rush ID Photo Package", monthlyQuantity: 300, sellingPricePerUnit: 150, unitVariableCost: 45 },
        ],
        operatingExpenses: [
          { id: "op-s1", description: "Monthly Shop Space Rent", costBehavior: "FIXED", monthlyAmount: 7000 },
          { id: "op-s2", description: "Print Operator Monthly Salary", costBehavior: "FIXED", monthlyAmount: 9500 },
          { id: "op-s3", description: "Electricity & High-Speed Fiber Internet", costBehavior: "FIXED", monthlyAmount: 3500 },
          { id: "op-s4", description: "Printer Maintenance & Replacement Rollers", costBehavior: "VARIABLE", monthlyAmount: 1000 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 1200,
        estimatedMonthlyDepreciation: 800,
        financialAssumptions: "Illustrative projection based on 750 print jobs and 300 binding/photo packages per month.",
      },
      taxConsiderations: {
        checkedItemIds: ["sec-registration", "barangay-mayors-permit", "bir-cor-2303", "separate-bank-bookkeeping"],
        chosenStructureNotes: "Registered Partnership with SEC, Municipal Mayor's Permit, and BIR Form 2303.",
        regulatoryComplianceNotes: "Issues official service invoices for student and organization printing contracts.",
      },
      riskFeasibility: {
        marketRisks: "Shift toward digital-only PDF submissions in some subjects.",
        financialRisks: "Rising wholesale bond paper costs.",
        operationalRisks: "Printhead failure during peak thesis defense week.",
        staffingRisks: "Operator fatigue during finals rush.",
        regulatoryRisks: "Data privacy compliance for student documents.",
        mitigationStrategies: "Operate 3 redundant printers so 1 unit is always available as backup; enforce daily file deletion.",
        feasibilityChecklist: {
          marketDemandVerified: true,
          operationalCapacityRealistic: true,
          capitalRequirementsAchievable: true,
          projectedProfitabilityPositive: true,
        },
        feasibilityConclusionStatus: "FEASIBLE_WITH_CONDITIONS",
        feasibilityStudentConclusion: "Feasible with 70% gross service margins and built-in printer redundancy.",
      },
      conclusionAppendices: {
        businessConclusion: "PrintSwift modernizes campus document services with an upload-ahead workflow and strong cash generation.",
        implementationTimeline: [
          { id: "tl-s1", phase: "Phase 1: Shop Lease & Printer Setup", targetPeriod: "Weeks 1–2", responsiblePerson: "Partners", deliverable: "3 printers calibrated and online form live" },
          { id: "tl-s2", phase: "Phase 2: Campus Launch", targetPeriod: "Week 3", responsiblePerson: "Full Team", deliverable: "Full operation" },
        ],
        supportingResearch: "Survey of thesis and practicum printing requirements.",
        surveySummaries: "Illustrative 50-student printing pain-point survey.",
        supplierQuotations: [
          { id: "sq-s1", supplierName: "OfficeTech PH (Illustrative)", itemDescription: "3 Duplex Ink-Tank Printers + Heavy Duty Comb Binder", quotedAmount: 28000, notes: "Includes starter ink bottles" },
        ],
        additionalAppendices: "Data privacy file-deletion policy and per-page rate card.",
      },
    },
  },
  {
    id: "cafe-catering-business",
    name: "Café & Catering Business Plan (Campus Event Catering Service)",
    tagline:
      "Student-managed mobile coffee bar and seminar snack-box catering enterprise serving campus events and meetings.",
    documentType: "BUSINESS_PLAN",
    category: "HOSPITALITY_TOURISM",
    illustrativeDisclaimer:
      "Illustrative Sample Only — Figures are hypothetical educational examples.",
    sampleData: {
      documentSetup: {
        documentType: "BUSINESS_PLAN",
        targetAudience: "IBE Hospitality Management Evaluation Panel",
        documentTitle: "Brew & Banquet — Campus Seminar Catering & Mobile Café Business Plan",
        studentNames: "Angela Villanueva & Catering Team",
        schoolOrProgram: "Institute of Business and Entrepreneurship (IBE)",
        courseAndSection: "Section 4A",
        instructorName: "Chef Marco Villanueva, CHP",
        submissionDate: "2026-10-29",
      },
      businessInfo: {
        businessName: "Brew & Banquet Hospitality Services (Illustrative Sample)",
        businessCategory: "HOSPITALITY_TOURISM",
        description:
          "Brew & Banquet is a student-managed mobile coffee-bar and seminar snack-box catering business tailored for college symposiums, leadership trainings, and faculty meetings.",
        location: "Commissary Kitchen in Poblacion, Rodriguez, Rizal + On-Site Campus Setup (Illustrative)",
        ownershipType: "PARTNERSHIP",
        mission: "To elevate campus seminars with punctual, hotel-grade snack boxes and freshly brewed coffee stations.",
        vision: "To be the premier student-run event catering enterprise in the academic community.",
        objectives: "1) Cater at least 12 campus seminar events (600+ pax total) per month; 2) Achieve 100% on-time ingress.",
        productsOrServices: "1) Seminar Snack Box + Brewed Coffee Dispenser Package (PHP 165/pax); 2) VIP Panelist Plated Meal & Espresso Bar Package (PHP 260/pax).",
        problemSolved: "Student org officers struggle to coordinate food delivery, coffee thermoses, and post-event trash cleanup during busy academic seminars.",
      },
      executiveSummary: {
        businessConcept: "Turnkey campus seminar catering business offering individually sealed snack boxes and staffed coffee urn stations.",
        targetMarketSummary: "Student councils, academic societies, and faculty departments hosting 50–150 pax events.",
        productsServicesSummary: "All-in PHP 165/pax Seminar Snack & Brew Package and PHP 260/pax VIP Speaker Package.",
        competitiveAdvantage: "Includes 30-minute early ingress, uniformed hospitality servers, chafing/coffee urn setup, and complete post-event waste bussing.",
        financialOverview: "Startup equipment and commissary setup of PHP 42,000 funded by PHP 45,000 partner equity. Projected Monthly Revenue of PHP 138,000 and Monthly Net Profit of PHP 38,300.",
        businessObjectivesSummary: "Break even at 261 catered heads per month.",
      },
      marketAnalysis: {
        targetCustomers: "Over 25 accredited student organizations and 3 academic institutes holding monthly symposiums and assemblies.",
        customerNeeds: "Predictable per-head pricing, official receipts for liquidation, dietary/halal-friendly options, and punctual delivery.",
        marketResearchFindings: "[ILLUSTRATIVE DATA] Campus calendar records an average of 18–25 seminars and workshops per month during active semesters.",
        surveyResultsSummary: "[ILLUSTRATIVE INTERVIEWS] 12 student org treasurers cited 'late food delivery and lack of liquidation invoices' as their top catering frustration.",
        competitors: [
          { id: "comp-c1", name: "Fast-Food Bulk Delivery (Illustrative)", priceRange: "PHP 155 – PHP 195/pax", strengths: "Brand familiarity", weaknesses: "No coffee station setup, no servers, org officers must distribute boxes and clean trash" },
        ],
        marketOpportunities: "Expanding into graduation ball and thesis defense panel catering.",
        swotStrengths: "Trained hospitality crew and turnkey setup/cleanup service.",
        swotWeaknesses: "Requires 72-hour advance booking lead time.",
        swotOpportunities: "Annual institutional events and faculty development seminars.",
        swotThreats: "Event date rescheduling due to weather suspensions.",
      },
      marketingSalesPlan: {
        productServiceStrategy: "Provide customizable menu tiers (baked pasta + chicken sandwich + iced/hot brew) with labeled allergen tags.",
        pricingStrategy: "Per-head package pricing (PHP 165 standard / PHP 260 VIP) requiring a 50% booking downpayment.",
        promotionAdvertising: "Direct tasting sampler boxes presented to Student Council presidents and faculty advisers.",
        distributionDelivery: "Insulated food transport boxes delivered 45 minutes before seminar snack break.",
        salesChannels: "Direct B2B/Org booking contracts and campus catering catalog.",
        customerAcquisition: "Free flowing brewed coffee upgrade for the first 5 org bookings of the semester.",
        customerRetention: "5% repeat-event rebate for student organizations signing a semester-long partnership.",
      },
      operationalPlan: {
        businessLocation: "20-sqm sanitary commissary kitchen with stainless prep tables, convection oven, and insulated food carriers.",
        equipmentAndSupplies: "2 Commercial 15L Percolator Coffee Urns, Convection Oven, Insulated Food Pan Carriers, and folding buffet tables.",
        materialsAndSuppliers: "Wholesale bakery flour/pasta suppliers, local highland coffee roaster, and food-grade kraft box supplier.",
        productionOrServiceProcess: "72-hr menu confirmation -> morning commissary baking & assembly -> insulated transport -> on-site service -> post-event bussing.",
        inventoryRequirements: "Event-based just-in-time perishable procurement plus 500-box packaging buffer.",
        operatingSchedule: "Bookings accepted Mon–Sat; event execution aligned with campus seminar schedules.",
        estimatedOperatingCapacity: "Up to 250 catered pax per day across 2 concurrent campus venues.",
        qualityControl: "Holding-temperature checks (>60°C for hot items), sealed tamper-evident box stickers, and food-handler gloves.",
        categorySpecificNotes: "Clear inclement-weather rebooking clause (free rescheduling if announced 24 hours prior).",
      },
      managementHrPlan: {
        organizationalStructure: "Event & Client Relations Lead, Head Commissary Chef, and On-Site Banquet Captain + on-call student stewards.",
        ownershipManagementRoles: "Partners oversee menu costing, client contracts, and kitchen QA.",
        staffingRequirements: [
          { id: "st-c1", roleTitle: "Commissary Cook & Baker", headcount: 1, monthlyCompensation: 10000, responsibilities: "Batch preparation of pasta, sandwiches, and pastries." },
          { id: "st-c2", roleTitle: "On-Site Banquet Stewards (Part-Time Pool)", headcount: 2, monthlyCompensation: 4500, responsibilities: "Venue ingress, coffee station service, and post-event cleanup." },
        ],
        jobDescriptions: "Hospitality students trained in food safety, banquet table skirting, and guest service.",
        employeeResponsibilities: "Punctual venue setup 45 minutes before break time and spotless venue turnover.",
        recruitmentSelectionApproach: "Recruit from practicum-ready students via practical tray-service and sanitation evaluation.",
        employeeTraining: "Banquet SOP drill and food-allergen safety briefing.",
        workplacePolicies: "Full chef/steward uniform, hairnets, and strict event timeline adherence.",
      },
      financialPlan: {
        startupCosts: [
          { id: "sc-c1", description: "Convection Oven, 2 Coffee Urns, Insulated Carriers & Buffet Tables", category: "CAPEX", amount: 24000 },
          { id: "sc-c2", description: "Permits, Sanitary Clearance & Sample Tasting Kits", category: "PRE_OPERATING", amount: 6000 },
          { id: "sc-c3", description: "Initial Packaging & Commissary Working Capital", category: "WORKING_CAPITAL", amount: 12000 },
        ],
        fundingSources: [
          { id: "fs-c1", description: "Co-Founders Equity Contribution", sourceType: "OWNER_EQUITY", amount: 45000 },
        ],
        salesForecast: [
          { id: "sf-c1", productOrServiceName: "Standard Seminar Snack & Coffee Package (Pax)", monthlyQuantity: 600, sellingPricePerUnit: 165, unitVariableCost: 78 },
          { id: "sf-c2", productOrServiceName: "VIP Speaker & Panelist Catering Package (Pax)", monthlyQuantity: 150, sellingPricePerUnit: 260, unitVariableCost: 120 },
        ],
        operatingExpenses: [
          { id: "op-c1", description: "Commissary Kitchen Rent & Utilities", costBehavior: "FIXED", monthlyAmount: 8000 },
          { id: "op-c2", description: "Commissary Cook & Banquet Stewards Compensation", costBehavior: "FIXED", monthlyAmount: 19000 },
          { id: "op-c3", description: "Event Transport & Cleaning Supplies", costBehavior: "VARIABLE", monthlyAmount: 3500 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 1200,
        estimatedMonthlyDepreciation: 800,
        financialAssumptions: "Illustrative projection based on 12 standard 50-pax seminars (600 pax) and 150 VIP pax per month.",
      },
      taxConsiderations: {
        checkedItemIds: ["sec-registration", "barangay-mayors-permit", "bir-cor-2303", "separate-bank-bookkeeping"],
        chosenStructureNotes: "Registered Partnership with BIR Official Invoices required by campus student organization audit rules.",
        regulatoryComplianceNotes: "Maintains Sanitary Permit and LGU Health Cards for all food handlers.",
      },
      riskFeasibility: {
        marketRisks: "Fewer campus events during exam and vacation weeks.",
        financialRisks: "Last-minute client cancellation after ingredients are purchased.",
        operationalRisks: "Campus venue power outlet limitations for coffee urns.",
        staffingRisks: "Steward class schedule overlap.",
        regulatoryRisks: "Strict campus food-safety audit requirements.",
        mitigationStrategies: "Require a non-refundable 50% booking deposit 5 days prior to each event and use pre-heated insulated thermal urns.",
        feasibilityChecklist: {
          marketDemandVerified: true,
          operationalCapacityRealistic: true,
          capitalRequirementsAchievable: true,
          projectedProfitabilityPositive: true,
        },
        feasibilityConclusionStatus: "FEASIBLE_WITH_CONDITIONS",
        feasibilityStudentConclusion: "Highly feasible; 50% booking deposits protect cash flow and break-even requires only ~5 small events per month.",
      },
      conclusionAppendices: {
        businessConclusion: "Brew & Banquet offers student organizations a dependable, liquidation-ready catering service while giving students real hospitality management experience.",
        implementationTimeline: [
          { id: "tl-c1", phase: "Phase 1: Commissary Setup & Menu Tasting", targetPeriod: "Week 1", responsiblePerson: "Client Relations Lead", deliverable: "Commissary clearance & menu tasting" },
          { id: "tl-c2", phase: "Phase 2: First Seminar Bookings", targetPeriod: "Weeks 2–4", responsiblePerson: "Full Team", deliverable: "Execute first 6 campus events" },
        ],
        supportingResearch: "Audit of student organization event calendars and catering liquidation requirements.",
        surveySummaries: "Interviews with 12 student organization treasurers.",
        supplierQuotations: [
          { id: "sq-c1", supplierName: "CaterEquip Manila (Illustrative)", itemDescription: "Convection Oven, 2x 15L Urns & Insulated Carriers", quotedAmount: 24000, notes: "1-year commercial warranty" },
        ],
        additionalAppendices: "Sample Catering Service Agreement and Allergen & Food Safety Checklist.",
      },
    },
  },
  {
    id: "student-startup-business",
    name: "Student Startup Business Plan (Campus Eco-Refill & Locker Hub)",
    tagline:
      "Sustainability-focused campus startup offering motorcycle helmet UV-sanitizing, locker storage, and detergent eco-refills.",
    documentType: "BUSINESS_PLAN",
    category: "CAMPUS_ENTERPRISE",
    illustrativeDisclaimer:
      "Illustrative Sample Only — Figures are hypothetical educational examples.",
    sampleData: {
      documentSetup: {
        documentType: "BUSINESS_PLAN",
        targetAudience: "IBE Sustainability & Venture Evaluation Panel",
        documentTitle: "GreenHub — Campus Helmet UV-Care & Eco-Refill Business Plan",
        studentNames: "Sample Student Founders (Section 4A)",
        schoolOrProgram: "Institute of Business and Entrepreneurship (IBE)",
        courseAndSection: "Section 4A",
        instructorName: "Prof. Ramon Bautista, MBA",
        submissionDate: "2026-10-29",
      },
      businessInfo: {
        businessName: "GreenHub Campus Eco-Station (Illustrative Sample)",
        businessCategory: "CAMPUS_ENTERPRISE",
        description:
          "GreenHub is a student-run sustainability kiosk near the campus parking zone offering 8-minute UV/ozone motorcycle helmet sanitizing, daily gear locker storage, and bring-your-own-bottle household liquid refills.",
        location: "Covered Walkway beside Student Motorcycle Parking Area (Illustrative)",
        ownershipType: "PARTNERSHIP",
        mission: "To provide practical commuter convenience and plastic-free household refills for the campus community.",
        vision: "To model a self-sustaining, zero-waste student social enterprise.",
        objectives: "1) Sanitize/store 900+ helmets per month; 2) Eliminate 500+ single-use plastic bottles monthly via eco-refills.",
        productsOrServices: "1) UV Helmet Sanitizing & Day Locker Pass (PHP 35); 2) Bring-Your-Own-Bottle Dishwashing/Fabric Refill per Liter (PHP 45).",
        problemSolved: "Motorcycle-riding students struggle with damp, odor-prone helmets and unguarded gear, while dormers overpay for single-use plastic sachets.",
      },
      executiveSummary: {
        businessConcept: "A compact 4-sqm green-campus utility kiosk combining commuter helmet care/storage with zero-waste liquid refills.",
        targetMarketSummary: "Over 600 daily student/faculty motorcycle riders and nearby student dormers.",
        productsServicesSummary: "PHP 35 UV Helmet Sanitizing + Locker Pass and PHP 45/liter biodegradable dishwashing/detergent refill.",
        competitiveAdvantage: "Located right at the motorcycle parking exit with automated 8-minute UV-C/deodorizing chamber and numbered steel lockers.",
        financialOverview: "Requires PHP 38,000 in startup costs funded by PHP 40,000 student founder equity. Projected Monthly Sales Revenue is PHP 54,000 with Monthly Net Profit of PHP 19,200.",
        businessObjectivesSummary: "Break even at 500 transactions/month while promoting zero-waste campus habits.",
      },
      marketAnalysis: {
        targetCustomers: "Student motorcycle commuters and boarding-house/dormitory residents.",
        customerNeeds: "Safe helmet storage during 4–6 hour class blocks, odor/bacteria removal during rainy weeks, and cheap detergent refills.",
        marketResearchFindings: "[ILLUSTRATIVE DATA] Campus parking logs 450+ motorcycles daily; helmets left on mirrors are exposed to rain and theft.",
        surveyResultsSummary: "[ILLUSTRATIVE SURVEY] 39 of 45 surveyed student riders expressed willingness to pay PHP 35 for combined UV sanitizing and secure locker storage.",
        competitors: [
          { id: "comp-st1", name: "Leaving Helmet on Motorcycle Mirror", priceRange: "PHP 0", strengths: "Free", weaknesses: "High risk of theft, rain soaking, and bacterial odor" },
        ],
        marketOpportunities: "Adding raincoat drying hooks and portable tire-inflator rental.",
        swotStrengths: "Low variable cost per UV cycle and strong alignment with campus sustainability goals.",
        swotWeaknesses: "Limited to 24 locker compartments at a time.",
        swotOpportunities: "Replicating the kiosk across neighboring college campuses.",
        swotThreats: "Extended online-class weeks reducing commuter volume.",
      },
      marketingSalesPlan: {
        productServiceStrategy: "Bundle 10-ride commuter cards at PHP 300 (saving PHP 50) and reward bottle reuse.",
        pricingStrategy: "Affordable micro-pricing: PHP 35 per helmet pass and PHP 45 per liter refill.",
        promotionAdvertising: "Rider club partnerships, parking gate signage, and Campus Sustainability Week demos.",
        distributionDelivery: "Direct walk-up kiosk service at the parking gate.",
        salesChannels: "On-site kiosk counter with cash and QRPh.",
        customerAcquisition: "First UV helmet cycle at PHP 15 during launch week.",
        customerRetention: "10-Pass Commuter Punch Card.",
      },
      operationalPlan: {
        businessLocation: "4-sqm kiosk booth adjacent to the campus motorcycle parking gate.",
        equipmentAndSupplies: "2 Commercial UV-C/Ozone Helmet Sanitizing Machines, 24-Door Steel Locker Bank, and 3 Stainless Carboy Refill Dispensers.",
        materialsAndSuppliers: "Accredited eco-friendly bulk surfactant manufacturer in Caloocan.",
        productionOrServiceProcess: "Rider hands over helmet -> 8-minute UV/ozone cycle -> stored in locked numbered cubby -> claim token presented upon exit.",
        inventoryRequirements: "100 liters bulk biodegradable dishwashing/detergent stock refilled bi-weekly.",
        operatingSchedule: "Monday to Saturday, 7:00 AM to 7:00 PM.",
        estimatedOperatingCapacity: "Up to 120 helmet cycles and 50 liter refills per day.",
        qualityControl: "Weekly UV-C bulb intensity check and daily locker disinfectant wipe-down.",
        categorySpecificNotes: "Enclosed UV chamber interlock ensures zero UV light exposure to staff or customers.",
      },
      managementHrPlan: {
        organizationalStructure: "4 Student Co-Founders rotating 3-hour kiosk shifts aligned with their free class periods + 1 Part-Time Kiosk Attendant.",
        ownershipManagementRoles: "Founders manage shift scheduling, campus reporting, and bulk restocking.",
        staffingRequirements: [
          { id: "st-st1", roleTitle: "Kiosk Attendant (Part-Time Student)", headcount: 1, monthlyCompensation: 6500, responsibilities: "Helmet intake/tagging, UV machine operation, and refill dispensing." },
        ],
        jobDescriptions: "Trustworthy student attendant with punctual shift attendance.",
        employeeResponsibilities: "Accurate claim-tag matching and daily cash/QRPh log.",
        recruitmentSelectionApproach: "Campus work-study applicant screening and practical kiosk SOP test.",
        employeeTraining: "UV machine safety interlock and spill-free dispensing orientation.",
        workplacePolicies: "Never release a stored helmet without matching numbered claim token and student ID verification.",
      },
      financialPlan: {
        startupCosts: [
          { id: "sc-st1", description: "2 UV Helmet Sanitizers, 24-Door Steel Locker & Refill Dispensers", category: "CAPEX", amount: 26000 },
          { id: "sc-st2", description: "Campus Booth Fabrication & Permits", category: "PRE_OPERATING", amount: 5000 },
          { id: "sc-st3", description: "Initial Bulk Eco-Refill Stock & Cash Reserve", category: "WORKING_CAPITAL", amount: 7000 },
        ],
        fundingSources: [
          { id: "fs-st1", description: "4 Student Founders Equity Contributions (PHP 10,000 each)", sourceType: "OWNER_EQUITY", amount: 40000 },
        ],
        salesForecast: [
          { id: "sf-st1", productOrServiceName: "UV Helmet Sanitizing & Locker Pass", monthlyQuantity: 900, sellingPricePerUnit: 35, unitVariableCost: 5 },
          { id: "sf-st2", productOrServiceName: "Eco-Household Liquid Refill (1 Liter)", monthlyQuantity: 500, sellingPricePerUnit: 45, unitVariableCost: 22 },
        ],
        operatingExpenses: [
          { id: "op-st1", description: "Campus Kiosk Space Fee & Electricity Share", costBehavior: "FIXED", monthlyAmount: 4500 },
          { id: "op-st2", description: "Part-Time Kiosk Attendant Allowance", costBehavior: "FIXED", monthlyAmount: 6500 },
          { id: "op-st3", description: "Deodorizing Mist & Sanitizer Consumables", costBehavior: "VARIABLE", monthlyAmount: 1500 },
        ],
        monthlyNonOperatingExpense: 0,
        estimatedMonthlyTaxExpense: 600,
        estimatedMonthlyDepreciation: 700,
        financialAssumptions: "Illustrative projection of 900 helmet passes (36/day) and 500 liter refills (20/day) across 25 school days.",
      },
      taxConsiderations: {
        checkedItemIds: ["dti-bnrs", "barangay-mayors-permit", "bir-cor-2303", "separate-bank-bookkeeping"],
        chosenStructureNotes: "Student Enterprise registered under Campus Incubation / Partnership guidelines with LGU & BIR compliance.",
        regulatoryComplianceNotes: "Monthly financial report submitted to both co-founders and the Campus Incubation Adviser.",
      },
      riskFeasibility: {
        marketRisks: "Lower commuter volume during exam or online class days.",
        financialRisks: "Equipment damage if voltage fluctuates.",
        operationalRisks: "Lost locker claim tokens by students.",
        staffingRisks: "Student shift conflicts.",
        regulatoryRisks: "Campus safety inspection compliance.",
        mitigationStrategies: "Use heavy-duty surge protectors, verify student ID for lost tokens, and maintain a 4-founder backup shift roster.",
        feasibilityChecklist: {
          marketDemandVerified: true,
          operationalCapacityRealistic: true,
          capitalRequirementsAchievable: true,
          projectedProfitabilityPositive: true,
        },
        feasibilityConclusionStatus: "FEASIBLE_WITH_CONDITIONS",
        feasibilityStudentConclusion: "Feasible with low fixed costs (PHP 11,700/month) and high utility value for student riders.",
      },
      conclusionAppendices: {
        businessConclusion: "GreenHub delivers measurable student convenience and campus plastic reduction with a self-sustaining financial model.",
        implementationTimeline: [
          { id: "tl-st1", phase: "Phase 1: Booth Placement & Permits", targetPeriod: "Week 1", responsiblePerson: "Project Lead", deliverable: "Signed stall agreement" },
          { id: "tl-st2", phase: "Phase 2: Locker & UV Machine Setup", targetPeriod: "Week 2", responsiblePerson: "Operations Lead", deliverable: "Safety inspection passed & launch" },
        ],
        supportingResearch: "Campus parking count and plastic-reduction impact estimate.",
        surveySummaries: "Illustrative 45-rider commuter survey.",
        supplierQuotations: [
          { id: "sq-st1", supplierName: "SafeRide & Steel Locker PH (Illustrative)", itemDescription: "2 UV Helmet Chambers + 24-Door Steel Locker", quotedAmount: 26000, notes: "Includes delivery" },
        ],
        additionalAppendices: "Kiosk Floor Sketch and Standard Operating Procedure Manual.",
      },
    },
  },
];

export function getBusinessPlanTemplateById(id: string): BusinessPlanTemplate | undefined {
  return BUSINESS_PLAN_TEMPLATES.find((tpl) => tpl.id === id);
}

/**
 * Instantiates a new BusinessPlanData object from a template.
 *
 * CRITICAL REQUIREMENT (Section 6):
 * "Students must be able to study a sample, start a new plan using its structure,
 * and replace the sample content with their own information.
 * Never copy a sample's financial figures into a student's new plan without the
 * student's explicit action."
 */
export function instantiateBusinessPlanTemplate(
  templateId: string,
  options?: {
    includeSampleFinancials?: boolean;
    studentName?: string;
  }
): BusinessPlanData | null {
  const tpl = getBusinessPlanTemplateById(templateId);
  if (!tpl) return null;

  const cloned: BusinessPlanData = structuredClone(tpl.sampleData);

  if (options?.studentName?.trim()) {
    cloned.documentSetup.studentNames = options.studentName.trim();
  }
  cloned.documentSetup.submissionDate = new Date().toISOString().slice(0, 10);

  if (!options?.includeSampleFinancials) {
    // Strip sample financial numbers unless the student explicitly opted in
    cloned.financialPlan = {
      startupCosts: cloned.financialPlan.startupCosts.map((r) => ({
        ...r,
        amount: 0,
      })),
      fundingSources: cloned.financialPlan.fundingSources.map((r) => ({
        ...r,
        amount: 0,
      })),
      salesForecast: cloned.financialPlan.salesForecast.map((r) => ({
        ...r,
        monthlyQuantity: 0,
        sellingPricePerUnit: 0,
        unitVariableCost: 0,
      })),
      operatingExpenses: cloned.financialPlan.operatingExpenses.map((r) => ({
        ...r,
        monthlyAmount: 0,
      })),
      monthlyNonOperatingExpense: 0,
      estimatedMonthlyTaxExpense: 0,
      estimatedMonthlyDepreciation: 0,
      financialAssumptions: "",
    };
    cloned.riskFeasibility.feasibilityConclusionStatus = "UNREVIEWED";
  }

  return cloned;
}
