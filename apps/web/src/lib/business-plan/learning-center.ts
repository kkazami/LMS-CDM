export interface LearningTopic {
  id: string;
  number: number;
  title: string;
  beginnerExplanation: string;
  purposeOfSection: string;
  whatToPrepare: string[];
  illustrativeExample: {
    businessName: string;
    sampleText: string;
  };
  commonMistakesToAvoid: string[];
  reviewChecklist: string[];
  relatedSubjects: string[];
}

export interface SubjectConnectionItem {
  subject: string;
  howItConnects: string;
}

export interface TaxChecklistItem {
  id: string;
  agency: string;
  title: string;
  description: string;
  officialUrl: string;
}

export const TAX_AND_REGISTRATION_CHECKLIST: TaxChecklistItem[] = [
  {
    id: "dti-bnrs",
    agency: "DTI",
    title: "DTI Business Name Registration (Sole Proprietorship)",
    description:
      "Registers your trade name with the Department of Trade and Industry (DTI) so no other sole proprietor in your chosen territorial scope can use the same business name.",
    officialUrl: "https://bnrs.dti.gov.ph",
  },
  {
    id: "sec-registration",
    agency: "SEC",
    title: "SEC Registration (Partnership, OPC, or Corporation)",
    description:
      "Registers Partnerships, One Person Corporations (OPC), and Domestic Corporations with the Securities and Exchange Commission (SEC) to establish juridical personality.",
    officialUrl: "https://www.sec.gov.ph",
  },
  {
    id: "barangay-mayors-permit",
    agency: "LGU / DTI",
    title: "Barangay Clearance, Mayor's Business Permit & Sanitary/BFP Clearances",
    description:
      "Local government authorization required to operate a physical stall, office, or home-based kitchen, including zoning, sanitary inspection, and fire safety certificates.",
    officialUrl: "https://www.dti.gov.ph/negosyo/starting-a-business/",
  },
  {
    id: "bir-cor-2303",
    agency: "BIR",
    title: "BIR Certificate of Registration (Form 2303), TIN & Official Invoicing",
    description:
      "Registers your business with the Bureau of Internal Revenue (BIR), specifies applicable tax types, authorizes printing of official invoices, and registers books of accounts. Note: Tax rates and thresholds depend on current law and BIR regulations.",
    officialUrl: "https://www.bir.gov.ph",
  },
  {
    id: "separate-bank-bookkeeping",
    agency: "BIR / Finance",
    title: "Separate Business Bank/E-Wallet Account & Registered Books of Accounts",
    description:
      "Maintains strict separation between personal student allowances/household funds and business cash flow, recording every receipt and expense in registered books of accounts.",
    officialUrl:
      "https://www.bir.gov.ph/index.php/registration-requirements/primary-registration/application-for-tin.html",
  },
];

export const SUBJECT_CONNECTIONS: SubjectConnectionItem[] = [
  {
    subject: "Managerial Accounting",
    howItConnects:
      "Applies cost behavior (Fixed vs. Variable costs), Contribution Margin per Unit, Cost-Volume-Profit (CVP) Break-Even Analysis, and Operating Profit budgeting in Step 8.",
  },
  {
    subject: "Human Resources Management",
    howItConnects:
      "Guides Step 7 workforce planning, compensation scheduling, shift rotation, employee training, and basic workplace policies.",
  },
  {
    subject: "Recruitment and Selection",
    howItConnects:
      "Structures job descriptions, role qualifications, applicant screening criteria, and practical work-sample trials in Step 7.",
  },
  {
    subject: "Organizational Development",
    howItConnects:
      "Aligns mission, vision, reporting hierarchy, accountability lines, and standard operating workflows across Steps 2, 6, and 7.",
  },
  {
    subject: "Income Taxation",
    howItConnects:
      "Introduces Philippine business registration (DTI/SEC, LGU, BIR Form 2303), invoicing, books of accounts, and entity-dependent tax compliance in Step 9.",
  },
  {
    subject: "Personal Finance",
    howItConnects:
      "Reinforces separating personal student funds from business capital, managing startup working-capital buffers, and distinguishing cash flow from accounting profit.",
  },
];

export const LEARNING_TOPICS: LearningTopic[] = [
  {
    id: "topic-1-what-is-business-plan",
    number: 1,
    title: "What is a Business Plan?",
    beginnerExplanation:
      "A business plan is a complete written roadmap that explains what your business is, what customer problem it solves, how it will attract buyers, how daily operations and staffing will work, and whether the numbers make financial sense.",
    purposeOfSection:
      "Gives you, your co-founders, and your faculty evaluators a clear blueprint of how your venture will launch and sustain itself.",
    whatToPrepare: [
      "Your core business concept and product/service offering.",
      "Who your target customers are and why they will buy from you.",
      "How the business will operate daily and how much startup capital is required.",
    ],
    illustrativeExample: {
      businessName: "Kusina Express Rice Bowls (Illustrative)",
      sampleText:
        "Kusina Express is a student-run food kiosk near campus serving freshly cooked PHP 75 chicken and tofu rice bowls within 3 minutes for college students with short class breaks.",
    },
    commonMistakesToAvoid: [
      "Writing vague aspirations ('We will be the #1 company in the world') without concrete operational and financial details.",
      "Treating sections in isolation so the marketing plan, staffing table, and financial numbers contradict one another.",
    ],
    reviewChecklist: [
      "Can a first-time reader understand what you sell and who buys it within 60 seconds?",
      "Are your marketing, operations, HR, and financial sections consistent with one another?",
      "Are all projections clearly backed by written assumptions?",
    ],
    relatedSubjects: ["Organizational Development", "Managerial Accounting"],
  },
  {
    id: "topic-2-key-components-of-business-plan",
    number: 2,
    title: "Key Components and Structure of a Business Plan",
    beginnerExplanation:
      "A standard collegiate business plan is organized into logical sections: Document Setup & Cover Page, Business Information & Company Profile, Executive Summary, Market Analysis, Marketing & Sales Plan, Operational Plan, Management & HR Plan, Financial Plan, Philippine Tax & Regulatory Compliance, Risk & Feasibility Evaluation, and Implementation Timeline & Appendices.",
    purposeOfSection:
      "Helps you understand how all 11 steps of the Business Plan Guide connect together so your final document reads like a cohesive professional study.",
    whatToPrepare: [
      "Your team member names, course/section, and faculty adviser details for Step 1.",
      "Your venture's industry category and legal ownership form for Step 2.",
      "Supporting research, survey summaries, and supplier price quotes for Step 11.",
    ],
    illustrativeExample: {
      businessName: "Brew & Banquet Campus Catering Plan (Illustrative)",
      sampleText:
        "Follows the complete 11-step business plan structure—connecting menu costing and event staffing directly to the Step 8 Income Statement and Break-Even tables.",
    },
    commonMistakesToAvoid: [
      "Skipping operational or human-resource sections and jumping straight to financial numbers.",
      "Leaving cover-page academic details or timeline milestones blank.",
    ],
    reviewChecklist: [
      "Are your student names, department, course section, and instructor entered in Step 1?",
      "Do you understand what each of the 11 builder steps requires?",
      "Have you checked the Readiness Sidebar to see which sections still need attention?",
    ],
    relatedSubjects: ["Organizational Development"],
  },
  {
    id: "topic-3-how-sections-connect",
    number: 3,
    title: "Aligning Your Strategy, Operations, and Financial Numbers",
    beginnerExplanation:
      "In a well-prepared business plan, every narrative decision has a matching financial entry. Your Step 5 pricing strategy determines your Step 8 selling prices; your Step 6 equipment list matches your Step 8 startup CAPEX; and your Step 7 staffing table matches your Step 8 monthly payroll expense.",
    purposeOfSection:
      "Teaches you how faculty panelists check your business plan for internal consistency across sections.",
    whatToPrepare: [
      "A list of products/services with target selling prices.",
      "A list of equipment and tools needed before opening day.",
      "Your planned staff headcount and monthly compensation.",
    ],
    illustrativeExample: {
      businessName: "PrintSwift Academic Copy Center (Illustrative)",
      sampleText:
        "Step 6 lists 3 duplex ink-tank printers and 1 heavy-duty binder (PHP 28,000); Step 8 Startup Costs records the exact same PHP 28,000 under CAPEX, and Step 11 attaches the supplier quote.",
    },
    commonMistakesToAvoid: [
      "Mentioning 4 delivery riders in the Marketing Plan while listing 0 riders in the HR Plan and Operating Expenses.",
      "Changing selling prices in Step 8 without updating the Executive Summary in Step 3.",
    ],
    reviewChecklist: [
      "Do your Step 5 prices match your Step 8 Sales Forecast table?",
      "Does your Step 6 equipment list match your Step 8 Startup CAPEX?",
      "Does your Step 7 staffing compensation align with your Step 8 Operating Expenses?",
    ],
    relatedSubjects: ["Organizational Development", "Managerial Accounting"],
  },
  {
    id: "topic-4-why-planning-matters",
    number: 4,
    title: "Why Business Planning is Important",
    beginnerExplanation:
      "Business planning lets you test your assumptions on paper before spending real money on equipment, leases, or inventory. It reveals early whether your selling price covers both direct unit costs and monthly fixed expenses.",
    purposeOfSection:
      "Prevents costly beginner mistakes like underpricing products, running out of working capital in Month 1, or buying expensive equipment that exceeds customer demand.",
    whatToPrepare: [
      "Realistic estimates of how many customers you can serve per day.",
      "Actual supplier price quotes for ingredients, inventory, or equipment.",
      "Awareness of your personal/team budget and schedule constraints.",
    ],
    illustrativeExample: {
      businessName: "EcoRefill Station (Illustrative)",
      sampleText:
        "By planning ahead, the student team discovered that renting a PHP 15,000/month mall stall would require 600 refills/month just to break even, prompting them to start with a PHP 4,500/month campus booth instead.",
    },
    commonMistakesToAvoid: [
      "Guessing selling prices without computing unit variable cost first.",
      "Spending 100% of startup funds on equipment and leaving PHP 0 for working capital.",
    ],
    reviewChecklist: [
      "Have you verified that your startup funding covers both equipment and initial working capital?",
      "Are your daily sales volume targets realistic for a student-run operation?",
      "Have you identified your biggest operational bottlenecks before launch?",
    ],
    relatedSubjects: ["Personal Finance", "Managerial Accounting"],
  },
  {
    id: "topic-5-choose-evaluate-idea",
    number: 5,
    title: "How to Choose and Evaluate a Business Idea",
    beginnerExplanation:
      "A strong student business idea solves a real, recurring problem for an accessible group of customers at a price they can afford and with startup capital your team can realistically raise.",
    purposeOfSection:
      "Guides Step 2 (Business Information) so your business description, mission, vision, objectives, and problem statement are grounded in reality.",
    whatToPrepare: [
      "The specific problem or inconvenience experienced by students, commuters, households, or local clients.",
      "Your proposed product or service solution.",
      "Measurable Year 1 business objectives (e.g., monthly unit volume, target margin, payback period).",
    ],
    illustrativeExample: {
      businessName: "GreenHub Helmet Care & Eco-Refill Station (Illustrative)",
      sampleText:
        "Problem: Motorcycle-riding students have nowhere safe to store helmets during rainy days and carry damp, smelly helmets to class. Solution: A PHP 35 helmet UV-sanitizing and dry-storage booth near the campus parking gate.",
    },
    commonMistakesToAvoid: [
      "Choosing a trendy business idea that requires millions of pesos in capital or specialized licenses you cannot obtain.",
      "Defining objectives that have no numbers or deadlines.",
    ],
    reviewChecklist: [
      "Does your Step 2 Problem Statement describe a real customer pain point?",
      "Are your Products/Services clearly listed with concrete specifications?",
      "Are your Mission, Vision, and Objectives specific and measurable?",
    ],
    relatedSubjects: ["Organizational Development"],
  },
  {
    id: "topic-6-basic-market-research",
    number: 6,
    title: "How to Conduct Basic Market Research",
    beginnerExplanation:
      "Basic market research combines primary research (short student surveys, interviews, foot-traffic counts, and price checks) with secondary research (local municipality data and industry reports) to verify real customer demand.",
    purposeOfSection:
      "Provides honest evidence for Step 4 (Market Analysis) without inventing fake statistics.",
    whatToPrepare: [
      "Sample size and method of your student survey or observation (e.g., 45 respondents surveyed via Google Forms).",
      "Key findings on buying frequency and price willingness.",
      "Clear labels distinguishing actual student survey data from illustrative estimates.",
    ],
    illustrativeExample: {
      businessName: "PrintSwift Academic Copy Center (Illustrative)",
      sampleText:
        "Illustrative Classroom Survey (n = 50 3rd/4th year students): 84% reported printing at least 40 pages per month, and 64% experienced 20+ minute queues at existing shops during midterm and thesis weeks.",
    },
    commonMistakesToAvoid: [
      "Inventing fake national statistics or claiming '100% of people will buy our product.'",
      "Asking only close friends 'Would you buy this?' instead of asking what they currently pay for alternatives.",
    ],
    reviewChecklist: [
      "Did you state how you gathered your market insights (survey, interviews, foot-traffic count)?",
      "Are illustrative or preliminary estimates clearly labeled as such?",
      "Do your Step 8 sales quantities align with your Step 4 market findings?",
    ],
    relatedSubjects: ["Organizational Development", "Managerial Accounting"],
  },
  {
    id: "topic-7-target-customers-competitors",
    number: 7,
    title: "How to Identify Target Customers and Competitors",
    beginnerExplanation:
      "Instead of saying 'everyone is our customer,' define a specific primary customer segment (who they are, their budget, and when they buy) and compare your venture honestly against direct and indirect competitors using a Competitor Matrix and SWOT analysis.",
    purposeOfSection:
      "Sharpens your competitive positioning in Step 4 so you know exactly why buyers will switch to or choose your business.",
    whatToPrepare: [
      "Primary and secondary customer profiles (age, role, daily/weekly budget, buying trigger).",
      "At least 2–3 direct or indirect competitors with their price ranges, strengths, and weaknesses.",
      "Internal Strengths & Weaknesses and External Opportunities & Threats (SWOT).",
    ],
    illustrativeExample: {
      businessName: "Kusina Express Rice Bowls (Illustrative)",
      sampleText:
        "Direct Competitor: Roadside Carinderia (PHP 65–85; Strength: wide viand selection; Weakness: slow queue at noon, non-sealed takeout packs). Our Edge: 3-minute pre-packed hot bowls with Messenger pre-ordering.",
    },
    commonMistakesToAvoid: [
      "Claiming 'We have zero competitors'—even if your product is new, customers currently spend their budget on an alternative.",
      "Confusing internal Strengths/Weaknesses with external Opportunities/Threats in SWOT.",
    ],
    reviewChecklist: [
      "Is your target customer segment defined with a realistic peso budget?",
      "Have you entered at least one competitor with strengths and weaknesses in Step 4?",
      "Are all four quadrants of your SWOT analysis completed?",
    ],
    relatedSubjects: ["Organizational Development"],
  },
  {
    id: "topic-8-marketing-plan",
    number: 8,
    title: "How to Create a Marketing and Sales Plan",
    beginnerExplanation:
      "Your Marketing and Sales Plan explains how you package your product/service, how you set profitable prices, how you promote to local college/community buyers, which sales channels you use, and how you keep customers coming back.",
    purposeOfSection:
      "Bridges your Market Analysis (Step 4) and your Sales Forecast (Step 8) with practical acquisition and retention tactics.",
    whatToPrepare: [
      "Product/service quality and packaging strategy.",
      "Pricing methodology (cost-plus markup, bundle pricing, or competitive benchmark).",
      "Promotion channels (Facebook/TikTok reels, campus booths, referrals) and loyalty programs.",
    ],
    illustrativeExample: {
      businessName: "LokalThread Online Studio (Illustrative)",
      sampleText:
        "Sales Channels: Weekly Facebook/TikTok Live selling + Shopee checkout link. Retention: PHP 20 repeat-buyer voucher code included inside every parcel pouch.",
    },
    commonMistakesToAvoid: [
      "Planning expensive billboard or TV ads for a small student startup budget.",
      "Setting a promotional discount price that drops below your variable unit cost.",
    ],
    reviewChecklist: [
      "Does your pricing strategy in Step 5 match the selling prices entered in Step 8?",
      "Are your promotional activities reflected in your Step 8 monthly marketing expense?",
      "Do you have concrete strategies for both customer acquisition and retention?",
    ],
    relatedSubjects: ["Managerial Accounting", "Organizational Development"],
  },
  {
    id: "topic-9-operational-plan",
    number: 9,
    title: "How to Prepare an Operational Plan",
    beginnerExplanation:
      "The Operational Plan describes the physical or digital workflow that turns raw materials and labor into finished products or services every day—covering location, equipment, suppliers, step-by-step production, inventory, operating hours, capacity, and quality control.",
    purposeOfSection:
      "Proves in Step 6 that your team has the equipment, supplier reliability, and daily capacity to deliver the sales volume promised in Step 8.",
    whatToPrepare: [
      "Location layout, utility needs, and equipment list.",
      "Primary and backup suppliers for raw materials or merchandise.",
      "Step-by-step service/production workflow, operating schedule, daily capacity limit, and quality control checks.",
    ],
    illustrativeExample: {
      businessName: "Kusina Express Rice Bowls (Illustrative)",
      sampleText:
        "Workflow: 7:00 AM batch cooking & portioning -> 10:00 AM warm-holding in bain-marie -> 45-second bowl assembly upon order -> QRPh/Cash payment. Capacity: 2 staff can assemble up to 45 bowls/hour (180 bowls/day max).",
    },
    commonMistakesToAvoid: [
      "Forecasting 500 units sold per day in Step 8 when your Step 6 equipment can only produce 80 units per day.",
      "Relying on a single supplier without a backup source.",
    ],
    reviewChecklist: [
      "Does your Step 6 operating capacity support your Step 8 monthly sales volume?",
      "Are the equipment items listed in Step 6 accounted for in Step 8 Startup Costs?",
      "Have you specified clear quality control and sanitation/safety measures?",
    ],
    relatedSubjects: ["Organizational Development", "Managerial Accounting"],
  },
  {
    id: "topic-10-organizational-hr-plan",
    number: 10,
    title: "How to Prepare an Organizational and Human Resources Plan",
    beginnerExplanation:
      "Your Management and HR Plan defines who owns the business, how responsibilities are divided, how many staff members are needed, how much they are paid, how you recruit and select qualified people, how you train them, and what workplace policies govern attendance, ethics, and cash handling.",
    purposeOfSection:
      "Connects directly to Human Resources Management, Recruitment and Selection, and Organizational Development in Step 7.",
    whatToPrepare: [
      "Organizational chart / reporting structure and owner responsibilities.",
      "Staffing table (role title, headcount, monthly compensation, and shift duties).",
      "Recruitment & selection criteria, onboarding training, and workplace rules.",
    ],
    illustrativeExample: {
      businessName: "PrintSwift Academic Copy Center (Illustrative)",
      sampleText:
        "Recruitment & Selection: Applicants undergo a 15-minute practical print-layout and paper-jam troubleshooting test. Training: 2-day onboarding on machine maintenance and daily cash reconciliation.",
    },
    commonMistakesToAvoid: [
      "Giving every co-founder the title 'CEO' without assigning who handles cooking/production, bookkeeping, and sales.",
      "Entering staff salaries in Step 7 but forgetting to include them in Step 8 Monthly Operating Expenses.",
    ],
    reviewChecklist: [
      "Does every role in Step 7 have clear daily responsibilities and qualifications?",
      "Is your recruitment, selection, and training process clearly explained?",
      "Are staff wages/allowances consistent with your Step 8 operating expenses?",
    ],
    relatedSubjects: [
      "Human Resources Management",
      "Recruitment and Selection",
      "Organizational Development",
    ],
  },
  {
    id: "topic-11-startup-costs-pricing-revenue-expenses",
    number: 11,
    title: "How to Calculate Startup Costs, Selling Prices, Revenue, and Expenses",
    beginnerExplanation:
      "Sound business math separates four distinct buckets: (1) One-time Startup Costs (equipment CAPEX, permits, working capital buffer), (2) Capital Funding Sources (owner equity, grants, loans), (3) Monthly Sales Revenue & Direct Cost of Goods Sold (COGS), and (4) Monthly Operating Expenses (rent, utilities, labor).",
    purposeOfSection:
      "Ensures your Step 8 financial model obeys core accounting principles: owner contributions are never treated as sales revenue, and one-time startup CAPEX is never double-counted as a monthly operating expense.",
    whatToPrepare: [
      "Itemized startup expenses categorized into CAPEX, Pre-Operating Permits, and Working Capital Reserve.",
      "Owner equity contributions or loans covering the startup budget.",
      "Unit selling prices, direct variable unit costs (COGS), and monthly fixed/variable operating expenses.",
    ],
    illustrativeExample: {
      businessName: "Kusina Express Financial Formula Example",
      sampleText:
        "If you sell 1,200 bowls/month at PHP 80 with a PHP 35 direct cost per bowl: Monthly Sales Revenue = 1,200 × 80 = PHP 96,000. Monthly COGS = 1,200 × 35 = PHP 42,000. Gross Profit = 96,000 − 42,000 = PHP 54,000.",
    },
    commonMistakesToAvoid: [
      "Counting owner capital contributions (e.g., PHP 30,000 founder cash) as Month 1 Sales Revenue.",
      "Expensing the full purchase price of a PHP 25,000 freezer every single month inside Operating Expenses.",
    ],
    reviewChecklist: [
      "Are Owner Contributions recorded under Funding Sources rather than Sales Forecast?",
      "Is Selling Price per Unit higher than Variable Cost per Unit for every item?",
      "Are one-time equipment purchases kept in Startup Costs (CAPEX) rather than repeated in monthly OPEX?",
    ],
    relatedSubjects: ["Managerial Accounting", "Personal Finance"],
  },
  {
    id: "topic-12-financial-projections-break-even",
    number: 12,
    title: "How to Prepare Financial Projections, Cash Flow, and Break-Even Analysis",
    beginnerExplanation:
      "Financial projections combine your Income Statement (Sales Revenue − COGS = Gross Profit; Gross Profit − Operating Expenses = Operating Profit; less Non-Operating/Tax = Net Profit), your Cash Flow Projection (tracking actual cash inflows and outflows), and your Break-Even Analysis (Fixed Costs ÷ Unit Contribution Margin).",
    purposeOfSection:
      "Shows in Step 8 how many units you must sell each month to cover fixed costs and distinguishes accounting profit from actual cash on hand.",
    whatToPrepare: [
      "Monthly Fixed Operating Expenses and estimated non-cash depreciation.",
      "Unit Selling Price and Unit Variable Cost to compute Contribution Margin per Unit.",
      "Clear written Financial Assumptions explaining how you estimated monthly quantities and costs.",
    ],
    illustrativeExample: {
      businessName: "Break-Even Formula Walkthrough",
      sampleText:
        "Monthly Fixed Costs = PHP 18,000. Selling Price per Unit = PHP 80. Variable Cost per Unit = PHP 35. Contribution Margin per Unit = 80 − 35 = PHP 45. Break-Even Units = 18,000 ÷ 45 = 400 units/month (PHP 32,000 in monthly sales).",
    },
    commonMistakesToAvoid: [
      "Attempting to compute break-even when Selling Price is less than or equal to Variable Cost (zero or negative contribution margin).",
      "Assuming projected numbers guarantee real-world profits without stating assumptions.",
    ],
    reviewChecklist: [
      "Is your weighted unit contribution margin positive so Break-Even Units can be calculated?",
      "Did you review the Cash Flow vs. Accounting Profit comparison table?",
      "Did you write clear Financial Assumptions at the bottom of Step 8?",
    ],
    relatedSubjects: ["Managerial Accounting", "Personal Finance", "Income Taxation"],
  },
  {
    id: "topic-13-risk-assessment-feasibility",
    number: 13,
    title: "How to Evaluate Business Risks and Feasibility",
    beginnerExplanation:
      "Every business faces market, financial, operational, staffing, and regulatory risks. A credible plan identifies these risks honestly, pairs them with actionable mitigation strategies, and evaluates feasibility across 4 pillars: market demand, operational capacity, capital adequacy, and projected profitability.",
    purposeOfSection:
      "Guides Step 10 so you perform a genuine, evidence-based feasibility evaluation rather than assuming the venture is feasible merely because the form is filled out.",
    whatToPrepare: [
      "Specific risks across all 5 categories (Market, Financial, Operational, Staffing, Regulatory).",
      "Concrete mitigation plans for each risk.",
      "Verification of the 4-Pillar Feasibility Checklist and a written Student Feasibility Justification.",
    ],
    illustrativeExample: {
      businessName: "Kusina Express Risk & Mitigation (Illustrative)",
      sampleText:
        "Financial Risk: 15% spike in chicken/cooking oil prices. Mitigation: Maintain a 55% gross margin buffer, lock in bi-weekly wholesale supplier pricing, and offer high-margin tofu/egg variations.",
    },
    commonMistakesToAvoid: [
      "Claiming 'Our business has no risks.'",
      "Marking a plan as feasible without checking whether projected sales exceed break-even volume.",
    ],
    reviewChecklist: [
      "Have you documented risks and mitigations across all 5 categories in Step 10?",
      "Have you reviewed all 4 pillars of the Feasibility Checklist?",
      "Did you select a Feasibility Assessment Status and write your justification?",
    ],
    relatedSubjects: ["Managerial Accounting", "Organizational Development", "Income Taxation"],
  },
  {
    id: "topic-14-compile-and-present",
    number: 14,
    title: "How to Compile and Present the Final Business Plan",
    beginnerExplanation:
      "In the final stage, review your Executive Summary (Step 3) so its numbers match Step 8, write your Business Conclusion and Implementation Timeline (Step 11), attach supporting research and supplier quotes, check the Readiness Sidebar for any warnings, and preview/export your formatted PDF or Word document.",
    purposeOfSection:
      "Ensures your exported Business Plan is complete, internally consistent, and presentation-ready.",
    whatToPrepare: [
      "A clear final conclusion summarizing venture readiness.",
      "An implementation timeline table with phases, target periods, responsible leads, and deliverables.",
      "Supplier quotations, survey summaries, and supporting appendices.",
    ],
    illustrativeExample: {
      businessName: "Pre-Launch Implementation Roadmap (Illustrative)",
      sampleText:
        "Weeks 1–2: Secure DTI & Barangay/LGU permits -> Week 3: Procure equipment & conduct food/service trial run -> Week 4: Campus soft launch & first weekly cash-flow audit.",
    },
    commonMistakesToAvoid: [
      "Exporting the final PDF while Step 3 Executive Summary still contains outdated draft numbers.",
      "Leaving out supplier quotations that prove how you estimated your Step 8 equipment costs.",
    ],
    reviewChecklist: [
      "Are all 11 steps marked Ready or Completed in the Validation Sidebar?",
      "Do the numbers in Step 3 match Step 8?",
      "Have you inspected the Document Preview before exporting to PDF or DOCX?",
    ],
    relatedSubjects: ["Organizational Development", "Managerial Accounting"],
  },
];
