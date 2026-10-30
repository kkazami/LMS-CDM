import type {
  CertificateAvailability,
  CourseLinkType,
  ExternalCourseEntry,
  IbeSubjectCategory,
  LearningProvider,
  LearningProviderId,
} from "./types";

export const IBE_SUBJECT_CATEGORIES: readonly IbeSubjectCategory[] = [
  "Entrepreneurship and Business Planning",
  "Managerial Accounting",
  "Financial Accounting and Financial Statements",
  "Income Taxation and Bookkeeping",
  "Personal Finance",
  "Recruitment and Selection",
  "Human Resources Management",
  "Organizational Development",
  "Marketing and Selling Online",
  "Business Administration",
  "Inventory Management and Business Operations",
  "Digital Skills and Professional Development",
] as const;

export const LEARNING_PROVIDERS: readonly LearningProvider[] = [
  {
    id: "HP_LIFE",
    name: "HP LIFE",
    shortName: "HP LIFE",
    homepageUrl: "https://www.life-global.org/",
    catalogUrl: "https://www.life-global.org/allcourses",
    description:
      "HP Foundation's global learning program offering free, self-paced entrepreneurship, finance, marketing, and operations courses.",
    certificatePolicyNote:
      "Verified free Certificate of Completion issued by HP LIFE upon finishing all course modules.",
    badgeColor: "amber",
  },
  {
    id: "SAYLOR_UNIVERSITY",
    name: "Saylor University",
    shortName: "Saylor",
    homepageUrl: "https://learn.saylor.org/",
    catalogUrl: "https://learn.saylor.org/course/index.php",
    description:
      "Non-profit open education platform offering college-level business, accounting, finance, management, and HR courses.",
    certificatePolicyNote:
      "Verified free digital course completion certificate upon passing the final exam with 70% or higher.",
    badgeColor: "blue",
  },
  {
    id: "HUBSPOT_ACADEMY",
    name: "HubSpot Academy",
    shortName: "HubSpot",
    homepageUrl: "https://academy.hubspot.com/",
    catalogUrl: "https://academy.hubspot.com/courses",
    description:
      "Industry training platform for digital marketing, content strategy, social media, inbound sales, and customer service.",
    certificatePolicyNote:
      "Verified free certification badge and certificate upon completing video lessons and passing the certification exam.",
    badgeColor: "orange",
  },
  {
    id: "OPENLEARN",
    name: "OpenLearn",
    shortName: "OpenLearn",
    homepageUrl: "https://www.open.edu/openlearn/",
    catalogUrl: "https://www.open.edu/openlearn/money-business/free-courses",
    description:
      "The Open University's open educational platform offering university-authored courses in bookkeeping, personal finance, HR, and management.",
    certificatePolicyNote:
      "Verified free OpenLearn Statement of Participation upon enrolling and completing all course sections.",
    badgeColor: "emerald",
  },
  {
    id: "SANTANDER_OPEN_ACADEMY",
    name: "Santander Open Academy",
    shortName: "Santander",
    homepageUrl: "https://www.santanderopenacademy.com/",
    catalogUrl: "https://www.santanderopenacademy.com/en/courses.html",
    description:
      "Global learning initiative providing on-demand courses and scholarships in digital marketing, leadership, negotiation, and professional skills.",
    certificatePolicyNote:
      "Certificate availability depends on the specific open-access course or scholarship track; check the official course page.",
    badgeColor: "rose",
  },
  {
    id: "ALISON",
    name: "Alison",
    shortName: "Alison",
    homepageUrl: "https://alison.com/",
    catalogUrl: "https://alison.com/courses/business",
    description:
      "Online learning platform with business administration, bookkeeping, taxation, recruitment, and operations courses.",
    certificatePolicyNote:
      "Course learning materials are free; official digital/printed certificates or diplomas typically require a separate purchase on Alison.",
    badgeColor: "purple",
  },
] as const;

export const EXTERNAL_COURSE_CATALOG: readonly ExternalCourseEntry[] = [
  // ─── 1. Entrepreneurship and Business Planning ───
  {
    id: "hplife-starting-a-small-business",
    title: "Starting a Small Business",
    providerId: "HP_LIFE",
    providerName: "HP LIFE",
    subject: "Entrepreneurship and Business Planning",
    description:
      "Learn how to turn a business idea into a structured enterprise, evaluate market readiness, and draft an actionable small business plan.",
    officialUrl: "https://www.life-global.org/course/17-starting-a-small-business",
    fallbackUrl: "https://www.life-global.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "Self-paced (~1–2 hours)",
    durationMinutes: 90,
    learningFormat: "Self-paced interactive modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate of Completion (complete all modules)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["entrepreneurship", "business plan", "startup", "small business", "hp life"],
  },
  {
    id: "hplife-design-thinking",
    title: "Design Thinking",
    providerId: "HP_LIFE",
    providerName: "HP LIFE",
    subject: "Entrepreneurship and Business Planning",
    description:
      "Apply customer-centric design thinking to identify real customer problems, brainstorm prototypes, and test new product or service concepts.",
    officialUrl: "https://www.life-global.org/course/16-design-thinking",
    fallbackUrl: "https://www.life-global.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "Self-paced (~1–2 hours)",
    durationMinutes: 90,
    learningFormat: "Self-paced interactive modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate of Completion (complete all modules)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["design thinking", "innovation", "product development", "entrepreneurship", "hp life"],
  },

  // ─── 2. Managerial Accounting ───
  {
    id: "saylor-bus105-managerial-accounting",
    title: "BUS105: Managerial Accounting",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Managerial Accounting",
    description:
      "Master cost behavior, cost-volume-profit (CVP) analysis, budgeting, variance analysis, and capital budgeting decisions for internal managers.",
    officialUrl: "https://learn.saylor.org/course/bus105",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "39 hours",
    durationMinutes: 2340,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["managerial accounting", "bus105", "cost accounting", "budgeting", "break-even", "saylor"],
  },
  {
    id: "hplife-basics-of-finance",
    title: "Basics of Finance",
    providerId: "HP_LIFE",
    providerName: "HP LIFE",
    subject: "Managerial Accounting",
    description:
      "Understand startup expenses, fixed and variable costs, profit margins, and financial statements to evaluate when a business turns a profit.",
    officialUrl: "https://www.life-global.org/course/21-basics-of-finance",
    fallbackUrl: "https://www.life-global.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "Self-paced (~1–2 hours)",
    durationMinutes: 90,
    learningFormat: "Self-paced interactive modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate of Completion (complete all modules)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["finance", "profit", "expenses", "fixed costs", "variable costs", "managerial accounting"],
  },
  {
    id: "hplife-cash-flow",
    title: "Cash Flow",
    providerId: "HP_LIFE",
    providerName: "HP LIFE",
    subject: "Managerial Accounting",
    description:
      "Learn how to track cash inflows and outflows, build a cash flow forecast, and prevent working-capital shortages in business operations.",
    officialUrl: "https://www.life-global.org/en/course/24-cash-flow",
    fallbackUrl: "https://www.life-global.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "Self-paced (~1–2 hours)",
    durationMinutes: 90,
    learningFormat: "Self-paced interactive modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate of Completion (complete all modules)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["cash flow", "working capital", "forecasting", "liquidity", "hp life"],
  },

  // ─── 3. Financial Accounting and Financial Statements ───
  {
    id: "saylor-bus103-financial-accounting",
    title: "BUS103: Introduction to Financial Accounting",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Financial Accounting and Financial Statements",
    description:
      "Study the accounting cycle, double-entry journalizing, adjusting entries, income statements, balance sheets, and statements of cash flows.",
    officialUrl: "https://learn.saylor.org/course/bus103",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "52 hours",
    durationMinutes: 3120,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["financial accounting", "bus103", "financial statements", "balance sheet", "income statement", "saylor"],
  },
  {
    id: "openlearn-companies-and-financial-accounting",
    title: "Companies and Financial Accounting",
    providerId: "OPENLEARN",
    providerName: "OpenLearn",
    subject: "Financial Accounting and Financial Statements",
    description:
      "Explore how companies raise capital and prepare published financial statements, including income statements and statements of financial position.",
    officialUrl:
      "https://www.open.edu/openlearn/money-business/companies-and-financial-accounting/content-section-0",
    fallbackUrl: "https://www.open.edu/openlearn/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "8 hours",
    durationMinutes: 480,
    learningFormat: "Self-paced university reading & activities",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free OpenLearn Statement of Participation",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["financial accounting", "openlearn", "corporate finance", "financial statements"],
  },

  // ─── 4. Income Taxation and Bookkeeping ───
  {
    id: "openlearn-intro-bookkeeping-accounting",
    title: "Introduction to Bookkeeping and Accounting",
    providerId: "OPENLEARN",
    providerName: "OpenLearn",
    subject: "Income Taxation and Bookkeeping",
    description:
      "Learn essential double-entry bookkeeping rules, debits and credits, trial balances, and accounting equations for small enterprises.",
    officialUrl:
      "https://www.open.edu/openlearn/money-business/introduction-bookkeeping-and-accounting/content-section-0",
    fallbackUrl: "https://www.open.edu/openlearn/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "8 hours",
    durationMinutes: 480,
    learningFormat: "Self-paced university reading & exercises",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free OpenLearn Statement of Participation",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["bookkeeping", "double entry", "trial balance", "openlearn", "accounting"],
  },
  {
    id: "alison-accounting-and-taxation-catalog",
    title: "Bookkeeping, Accounting & Taxation Courses (Official Catalog)",
    providerId: "ALISON",
    providerName: "Alison",
    subject: "Income Taxation and Bookkeeping",
    description:
      "Browse Alison's official finance and accounting catalog covering bookkeeping, payroll, tax compliance, and financial record-keeping.",
    officialUrl: "https://alison.com/courses/finance",
    fallbackUrl: "https://alison.com/",
    linkType: "PROVIDER_CATEGORY",
    durationLabel: null,
    durationMinutes: null,
    learningFormat: "Self-paced online catalog",
    certificateAvailability: "PAID_OR_CONDITIONAL",
    certificateConditionLabel: "Free learning; official Alison certificates require purchase",
    pricingStatus: "FREE_LEARNING_PAID_CERT",
    pricingLabel: "Free Course / Paid Certificate",
    isInitialSeed: false,
    keywords: ["alison", "taxation", "income tax", "bookkeeping", "payroll"],
  },

  // ─── 5. Personal Finance ───
  {
    id: "openlearn-managing-my-money",
    title: "Managing My Money",
    providerId: "OPENLEARN",
    providerName: "OpenLearn",
    subject: "Personal Finance",
    description:
      "Build practical personal finance skills including household budgeting, debt management, savings, investments, insurance, and retirement planning.",
    officialUrl: "https://www.open.edu/openlearn/money-business/managing-my-money/content-section-0",
    fallbackUrl: "https://www.open.edu/openlearn/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "24 hours",
    durationMinutes: 1440,
    learningFormat: "Self-paced video & text course",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free OpenLearn Statement of Participation",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["personal finance", "budgeting", "savings", "debt", "investing", "openlearn"],
  },
  {
    id: "saylor-bus202-principles-of-finance",
    title: "BUS202: Principles of Finance",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Personal Finance",
    description:
      "Understand time value of money, interest rates, risk and return, valuation, and financial planning principles applicable to personal and business wealth.",
    officialUrl: "https://learn.saylor.org/course/bus202",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "36 hours",
    durationMinutes: 2160,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["principles of finance", "time value of money", "personal finance", "bus202", "saylor"],
  },

  // ─── 6. Recruitment and Selection ───
  {
    id: "openlearn-hr-recruitment-and-selection",
    title: "Human Resources: Recruitment and Selection",
    providerId: "OPENLEARN",
    providerName: "OpenLearn",
    subject: "Recruitment and Selection",
    description:
      "Learn how to plan workforce hiring, write job descriptions and person specifications, conduct structured interviews, and evaluate candidate fit fairly.",
    officialUrl:
      "https://www.open.edu/openlearn/money-business/human-resources-recruitment-selection/content-section-0",
    fallbackUrl: "https://www.open.edu/openlearn/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "12 hours",
    durationMinutes: 720,
    learningFormat: "Self-paced university modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free OpenLearn Statement of Participation",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["recruitment", "selection", "hiring", "interviews", "job description", "hr", "openlearn"],
  },
  {
    id: "hplife-hiring-staff-catalog",
    title: "HP LIFE Business & Hiring Courses (Official Catalog)",
    providerId: "HP_LIFE",
    providerName: "HP LIFE",
    subject: "Recruitment and Selection",
    description:
      "Explore HP LIFE's official course catalog including Hiring Staff, team building, and communication skills for growing small enterprises.",
    officialUrl: "https://www.life-global.org/allcourses",
    fallbackUrl: "https://www.life-global.org/",
    linkType: "PROVIDER_CATEGORY",
    durationLabel: null,
    durationMinutes: null,
    learningFormat: "Self-paced interactive catalog",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate of Completion on all HP LIFE courses",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["hiring staff", "recruitment", "selection", "hp life", "interviewing"],
  },

  // ─── 7. Human Resources Management ───
  {
    id: "saylor-bus301-human-resource-management",
    title: "BUS301: Human Resource Management",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Human Resources Management",
    description:
      "Comprehensive course covering strategic human resource planning, recruitment, training, performance appraisal, compensation, and workplace employment law.",
    officialUrl: "https://learn.saylor.org/course/bus301",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "49 hours",
    durationMinutes: 2940,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["human resource management", "hrm", "bus301", "compensation", "training", "saylor"],
  },
  {
    id: "openlearn-workplace-coaching-mentoring",
    title: "Workplace Learning with Coaching and Mentoring",
    providerId: "OPENLEARN",
    providerName: "OpenLearn",
    subject: "Human Resources Management",
    description:
      "Examine employee training lifecycles, workplace coaching, mentoring frameworks, and talent development strategies for HR practitioners.",
    officialUrl:
      "https://www.open.edu/openlearn/money-business/workplace-learning-coaching-and-mentoring/content-section-0",
    fallbackUrl: "https://www.open.edu/openlearn/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "15 hours",
    durationMinutes: 900,
    learningFormat: "Self-paced university modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free OpenLearn Statement of Participation",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["coaching", "mentoring", "training", "human resources", "openlearn"],
  },

  // ─── 8. Organizational Development ───
  {
    id: "saylor-bus401-management-leadership",
    title: "BUS401: Management Leadership",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Organizational Development",
    description:
      "Develop leadership capabilities in organizational behavior, team motivation, change management, conflict resolution, and ethical decision-making.",
    officialUrl: "https://learn.saylor.org/course/bus401",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "37 hours",
    durationMinutes: 2220,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["organizational development", "leadership", "change management", "bus401", "saylor"],
  },
  {
    id: "openlearn-diversity-inclusion-workplace",
    title: "Diversity and Inclusion in the Workplace",
    providerId: "OPENLEARN",
    providerName: "OpenLearn",
    subject: "Organizational Development",
    description:
      "Understand organizational culture, psychological safety, and equitable policies that strengthen employee engagement and organizational effectiveness.",
    officialUrl:
      "https://www.open.edu/openlearn/money-business/diversity-and-inclusion-the-workplace/content-section-0",
    fallbackUrl: "https://www.open.edu/openlearn/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "6 hours",
    durationMinutes: 360,
    learningFormat: "Self-paced university modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free OpenLearn Statement of Participation",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["organizational culture", "diversity", "inclusion", "organizational development", "openlearn"],
  },

  // ─── 9. Marketing and Selling Online ───
  {
    id: "hubspot-digital-marketing-certification",
    title: "Digital Marketing Certification",
    providerId: "HUBSPOT_ACADEMY",
    providerName: "HubSpot Academy",
    subject: "Marketing and Selling Online",
    description:
      "Learn omnichannel digital marketing, SEO, website optimization, social media promotion, video marketing, email campaigns, and online advertising.",
    officialUrl: "https://academy.hubspot.com/courses/digital-marketing",
    fallbackUrl: "https://academy.hubspot.com/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "Self-paced (~4–5 hours)",
    durationMinutes: 270,
    learningFormat: "Video lessons + certification exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free HubSpot Digital Marketing Certification",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["digital marketing", "hubspot", "seo", "online selling", "social media", "email marketing"],
  },
  {
    id: "hubspot-content-marketing-certification",
    title: "Content Marketing Certification",
    providerId: "HUBSPOT_ACADEMY",
    providerName: "HubSpot Academy",
    subject: "Marketing and Selling Online",
    description:
      "Master storytelling, content planning frameworks, repurposing content, and search optimization to attract and convert online buyers.",
    officialUrl: "https://academy.hubspot.com/courses/content-marketing",
    fallbackUrl: "https://academy.hubspot.com/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "Self-paced (~7–8 hours)",
    durationMinutes: 450,
    learningFormat: "Video lessons + certification exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free HubSpot Content Marketing Certification",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["content marketing", "hubspot", "copywriting", "brand storytelling", "seo"],
  },
  {
    id: "santander-seo-and-content-marketing",
    title: "SEO and Content Marketing",
    providerId: "SANTANDER_OPEN_ACADEMY",
    providerName: "Santander Open Academy",
    subject: "Marketing and Selling Online",
    description:
      "Understand search engine optimization fundamentals, keyword research, and content strategies to improve organic visibility for online businesses.",
    officialUrl:
      "https://www.santanderopenacademy.com/en/courses/seo-and-content-marketing.html/index.htm",
    fallbackUrl: "https://www.santanderopenacademy.com/",
    linkType: "VERIFIED_COURSE",
    durationLabel: null,
    durationMinutes: null,
    learningFormat: "Self-paced online course",
    certificateAvailability: "UNVERIFIED",
    certificateConditionLabel: "Check Santander Open Academy course page for certificate terms",
    pricingStatus: "FREE",
    pricingLabel: "Free Open Access",
    isInitialSeed: true,
    keywords: ["santander", "seo", "content marketing", "search engine", "digital marketing"],
  },
  {
    id: "saylor-bus203-principles-of-marketing",
    title: "BUS203: Principles of Marketing",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Marketing and Selling Online",
    description:
      "Examine market segmentation, consumer behavior, branding, pricing strategies, distribution channels, and integrated marketing communications.",
    officialUrl: "https://learn.saylor.org/course/bus203",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "46 hours",
    durationMinutes: 2760,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["marketing", "bus203", "pricing", "branding", "consumer behavior", "saylor"],
  },

  // ─── 10. Business Administration ───
  {
    id: "saylor-bus208-principles-of-management",
    title: "BUS208: Principles of Management",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Business Administration",
    description:
      "Learn the P-O-L-C framework (Planning, Organizing, Leading, and Controlling) for managing modern business organizations effectively.",
    officialUrl: "https://learn.saylor.org/course/bus208",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "36 hours",
    durationMinutes: 2160,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["business administration", "management", "bus208", "planning", "organizing", "saylor"],
  },
  {
    id: "alison-business-management-catalog",
    title: "Business Administration & Management Courses (Official Catalog)",
    providerId: "ALISON",
    providerName: "Alison",
    subject: "Business Administration",
    description:
      "Official Alison Business course catalog featuring courses in business administration, project management, office management, and corporate governance.",
    officialUrl: "https://alison.com/courses/business",
    fallbackUrl: "https://alison.com/",
    linkType: "PROVIDER_CATEGORY",
    durationLabel: null,
    durationMinutes: null,
    learningFormat: "Self-paced online catalog",
    certificateAvailability: "PAID_OR_CONDITIONAL",
    certificateConditionLabel: "Free learning; official Alison certificates require purchase",
    pricingStatus: "FREE_LEARNING_PAID_CERT",
    pricingLabel: "Free Course / Paid Certificate",
    isInitialSeed: false,
    keywords: ["alison", "business administration", "office management", "operations"],
  },
  {
    id: "openlearn-money-and-business-catalog",
    title: "OpenLearn Money & Business Free Courses (Official Catalog)",
    providerId: "OPENLEARN",
    providerName: "OpenLearn",
    subject: "Business Administration",
    description:
      "Official OpenLearn Money & Business catalog with university-level courses in business administration, ethics, economics, and enterprise leadership.",
    officialUrl: "https://www.open.edu/openlearn/money-business/free-courses",
    fallbackUrl: "https://www.open.edu/openlearn/",
    linkType: "PROVIDER_CATEGORY",
    durationLabel: null,
    durationMinutes: null,
    learningFormat: "Self-paced university catalog",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free OpenLearn Statement of Participation on completed courses",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["openlearn", "money and business", "business administration", "management"],
  },

  // ─── 11. Inventory Management and Business Operations ───
  {
    id: "hplife-inventory-management",
    title: "Inventory Management",
    providerId: "HP_LIFE",
    providerName: "HP LIFE",
    subject: "Inventory Management and Business Operations",
    description:
      "Understand stock control, reorder points, supply tracking, and waste reduction to keep retail, food, or manufacturing operations profitable.",
    officialUrl: "https://www.life-global.org/en/course/37-inventory-management",
    fallbackUrl: "https://www.life-global.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "Self-paced (~1–2 hours)",
    durationMinutes: 90,
    learningFormat: "Self-paced interactive modules",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate of Completion (complete all modules)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: true,
    keywords: ["inventory management", "stock control", "operations", "supply chain", "hp life"],
  },
  {
    id: "saylor-bus300-operations-management",
    title: "BUS300: Operations Management",
    providerId: "SAYLOR_UNIVERSITY",
    providerName: "Saylor University",
    subject: "Inventory Management and Business Operations",
    description:
      "Analyze production scheduling, quality control, capacity planning, supply chain logistics, and inventory optimization in service and manufacturing firms.",
    officialUrl: "https://learn.saylor.org/course/bus300",
    fallbackUrl: "https://learn.saylor.org/",
    linkType: "VERIFIED_COURSE",
    durationLabel: "49 hours",
    durationMinutes: 2940,
    learningFormat: "Self-paced university course + final exam",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free Certificate (pass final exam with 70%+)",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["operations management", "bus300", "supply chain", "quality control", "inventory", "saylor"],
  },

  // ─── 12. Digital Skills and Professional Development ───
  {
    id: "santander-open-academy-courses-catalog",
    title: "Santander Open Academy — Professional & Digital Skills Catalog",
    providerId: "SANTANDER_OPEN_ACADEMY",
    providerName: "Santander Open Academy",
    subject: "Digital Skills and Professional Development",
    description:
      "Explore Santander Open Academy's official catalog of courses in digital productivity, business communication, negotiation, AI tools, and career readiness.",
    officialUrl: "https://www.santanderopenacademy.com/",
    fallbackUrl: "https://www.santanderopenacademy.com/",
    linkType: "PROVIDER_HOMEPAGE",
    durationLabel: null,
    durationMinutes: null,
    learningFormat: "On-demand courses & scholarship programs",
    certificateAvailability: "UNVERIFIED",
    certificateConditionLabel: "Check individual Santander course page for certificate terms",
    pricingStatus: "FREE",
    pricingLabel: "Free Open Access",
    isInitialSeed: false,
    keywords: ["santander", "digital skills", "professional development", "negotiation", "career"],
  },
  {
    id: "hubspot-inbound-certification",
    title: "Inbound Marketing & Business Growth Courses (Official Catalog)",
    providerId: "HUBSPOT_ACADEMY",
    providerName: "HubSpot Academy",
    subject: "Digital Skills and Professional Development",
    description:
      "Browse HubSpot Academy's official training library covering CRM software, professional sales communication, customer success, and digital operations.",
    officialUrl: "https://academy.hubspot.com/courses",
    fallbackUrl: "https://academy.hubspot.com/",
    linkType: "PROVIDER_CATEGORY",
    durationLabel: null,
    durationMinutes: null,
    learningFormat: "Video courses & certifications",
    certificateAvailability: "FREE_VERIFIED",
    certificateConditionLabel: "Free certification on HubSpot Academy certification tracks",
    pricingStatus: "FREE",
    pricingLabel: "100% Free",
    isInitialSeed: false,
    keywords: ["hubspot", "crm", "digital skills", "customer service", "professional development"],
  },
] as const;

export function getCourseById(courseId: string): ExternalCourseEntry | undefined {
  return EXTERNAL_COURSE_CATALOG.find((c) => c.id === courseId);
}

export function getProviderById(providerId: LearningProviderId): LearningProvider | undefined {
  return LEARNING_PROVIDERS.find((p) => p.id === providerId);
}

export interface CatalogFilterOptions {
  search?: string;
  subject?: IbeSubjectCategory | "ALL";
  providerId?: LearningProviderId | "ALL";
  certificateAvailability?: CertificateAvailability | "ALL";
  linkType?: CourseLinkType | "ALL";
  sortBy?: "RECOMMENDED" | "TITLE_ASC" | "DURATION_ASC";
}

export function filterAndSortCatalog(options: CatalogFilterOptions = {}): ExternalCourseEntry[] {
  const query = (options.search ?? "").trim().toLowerCase();
  const subject = options.subject ?? "ALL";
  const providerId = options.providerId ?? "ALL";
  const certFilter = options.certificateAvailability ?? "ALL";
  const linkType = options.linkType ?? "ALL";
  const sortBy = options.sortBy ?? "RECOMMENDED";

  const filtered = EXTERNAL_COURSE_CATALOG.filter((course) => {
    if (subject !== "ALL" && course.subject !== subject) return false;
    if (providerId !== "ALL" && course.providerId !== providerId) return false;
    if (certFilter !== "ALL" && course.certificateAvailability !== certFilter) return false;
    if (linkType !== "ALL" && course.linkType !== linkType) return false;

    if (query) {
      const haystack = [
        course.title,
        course.providerName,
        course.subject,
        course.description,
        ...course.keywords,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });

  const sorted = [...filtered];
  if (sortBy === "TITLE_ASC") {
    sorted.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === "DURATION_ASC") {
    sorted.sort((a, b) => {
      const aDur = a.durationMinutes ?? Number.MAX_SAFE_INTEGER;
      const bDur = b.durationMinutes ?? Number.MAX_SAFE_INTEGER;
      if (aDur !== bDur) return aDur - bDur;
      return a.title.localeCompare(b.title);
    });
  } else {
    // RECOMMENDED: Verified individual courses first, then initial seeds, then alphabetical
    const linkPriority: Record<CourseLinkType, number> = {
      VERIFIED_COURSE: 0,
      PROVIDER_CATEGORY: 1,
      PROVIDER_HOMEPAGE: 2,
    };
    sorted.sort((a, b) => {
      const pDiff = linkPriority[a.linkType] - linkPriority[b.linkType];
      if (pDiff !== 0) return pDiff;
      if (a.isInitialSeed !== b.isInitialSeed) return a.isInitialSeed ? -1 : 1;
      return a.title.localeCompare(b.title);
    });
  }

  return sorted;
}

