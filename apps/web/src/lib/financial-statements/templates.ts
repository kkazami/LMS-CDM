import type {
  ColumnDef,
  RowSeed,
  SectionDef,
  StatementData,
  StatementRow,
  StatementType,
  TemplateDef,
} from "./types";

/**
 * The 10 report templates. These are code-owned and never written to by
 * students: creating a statement deep-copies a template into a student-owned
 * row, and "reset" re-derives the copy from here.
 *
 * Amount cells are intentionally blank — the generator never invents figures.
 */

const labelCol = (label = "Account / Description", placeholder = "Description"): ColumnDef => ({
  id: "label",
  label,
  kind: "text",
  required: true,
  placeholder,
});

const amountCol = (overrides: Partial<ColumnDef> = {}): ColumnDef => ({
  id: "amount",
  label: "Amount (PHP)",
  kind: "money",
  required: true,
  placeholder: "0.00",
  ...overrides,
});

const seed = (key: string, label: string, extra: Partial<RowSeed> & { values?: Record<string, string> } = {}): RowSeed => ({
  key,
  required: extra.required,
  values: { label, ...(extra.values ?? {}) },
});

const blankSeed = (count: number, values: Record<string, string> = {}): RowSeed[] =>
  Array.from({ length: count }, () => ({ values: { ...values } }));

const flowCol: ColumnDef = {
  id: "flow",
  label: "Type",
  kind: "select",
  required: true,
  options: ["Inflow", "Outflow"],
};

const amountSection = (
  id: string,
  title: string,
  seeds: RowSeed[],
  addLabel: string,
  opts: { hint?: string; allowNegative?: boolean; columns?: ColumnDef[] } = {},
): SectionDef => ({
  id,
  title,
  hint: opts.hint,
  columns: opts.columns ?? [labelCol(), amountCol({ allowNegative: opts.allowNegative })],
  seeds,
  addLabel,
});

const INCOME_STATEMENT: TemplateDef = {
  type: "INCOME_STATEMENT",
  name: "Income Statement",
  category: "Core Statements",
  description: "Revenue, expenses, and net profit or loss for a period.",
  purpose: "Calculate business revenue, expenses, and net profit or loss.",
  periodMode: "period",
  formulas: [
    "Net Sales = Sales Revenue − Sales Returns and Allowances",
    "Gross Profit = Net Sales − Cost of Goods Sold",
    "Total Revenue and Other Income = Net Sales + Other Income",
    "Net Profit (Loss) = Total Revenue and Other Income − (Cost of Goods Sold + Operating Expenses)",
  ],
  sections: [
    amountSection("revenue", "Revenue", [seed("salesRevenue", "Sales Revenue", { required: true })], "Add revenue row"),
    amountSection(
      "returns",
      "Sales Returns and Allowances",
      [seed("salesReturns", "Sales Returns and Allowances")],
      "Add returns row",
      { hint: "Enter as a positive amount. It is subtracted from Sales Revenue." },
    ),
    amountSection("otherIncome", "Other Income", [seed("otherIncome", "Other Income")], "Add income row"),
    amountSection(
      "cogs",
      "Cost of Goods Sold",
      [seed("cogs", "Cost of Goods Sold")],
      "Add cost row",
      { hint: "Counted once — it is not repeated under Operating Expenses." },
    ),
    amountSection(
      "opex",
      "Operating Expenses",
      [
        seed("rent", "Rent Expense"),
        seed("salaries", "Salaries Expense"),
        seed("utilities", "Utilities Expense"),
        seed("depreciation", "Depreciation Expense"),
        seed("otherExpenses", "Other Expenses"),
      ],
      "Add expense row",
    ),
  ],
};

const BALANCE_SHEET: TemplateDef = {
  type: "BALANCE_SHEET",
  name: "Balance Sheet",
  category: "Core Statements",
  description: "Assets, liabilities, and owner's equity on a specific date.",
  purpose: "Show the business's assets, liabilities, and equity on a specific date.",
  periodMode: "asOf",
  formulas: [
    "Total Assets = Σ asset balances − Σ contra-asset balances",
    "Total Liabilities = Σ liability balances",
    "Total Equity = Σ equity accounts",
    "Total Liabilities and Equity = Total Liabilities + Total Equity",
    "Balanced when Total Assets = Total Liabilities and Equity",
  ],
  sections: [
    amountSection(
      "assets",
      "Assets",
      [
        seed("cash", "Cash", { required: true }),
        seed("receivable", "Accounts Receivable"),
        seed("inventory", "Inventory"),
        seed("prepaid", "Prepaid Expenses"),
        seed("equipment", "Equipment"),
      ],
      "Add asset",
    ),
    amountSection(
      "contraAssets",
      "Less: Contra-Asset Accounts",
      [seed("accumDep", "Accumulated Depreciation")],
      "Add contra-asset",
      { hint: "Enter as a positive amount. It is subtracted from total assets." },
    ),
    amountSection(
      "liabilities",
      "Liabilities",
      [
        seed("payable", "Accounts Payable"),
        seed("loans", "Loans Payable"),
        seed("otherLiabilities", "Other Liabilities"),
      ],
      "Add liability",
    ),
    amountSection(
      "equity",
      "Owner's Equity",
      [seed("capital", "Owner's Capital"), seed("retained", "Retained Earnings")],
      "Add equity account",
      { allowNegative: true, hint: "Negative values are allowed here (e.g. accumulated deficit)." },
    ),
  ],
};

const CASH_FLOW: TemplateDef = {
  type: "CASH_FLOW",
  name: "Cash Flow Statement",
  category: "Core Statements",
  description: "Cash received and paid across operating, investing and financing activities.",
  purpose: "Report cash received and paid during a reporting period.",
  periodMode: "period",
  formulas: [
    "Net Cash Flow (each activity) = Cash Inflows − Cash Outflows",
    "Net Change in Cash = Operating + Investing + Financing",
    "Ending Cash Balance = Beginning Cash Balance + Net Change in Cash",
  ],
  sections: [
    amountSection(
      "operating",
      "Cash Flows from Operating Activities",
      [
        seed("opIn", "Cash received from customers", { values: { flow: "Inflow" } }),
        seed("opOutSuppliers", "Cash paid to suppliers", { values: { flow: "Outflow" } }),
        seed("opOutSalaries", "Cash paid for salaries and wages", { values: { flow: "Outflow" } }),
        seed("opOutExpenses", "Cash paid for rent and utilities", { values: { flow: "Outflow" } }),
      ],
      "Add operating item",
      { columns: [labelCol(), flowCol, amountCol()], hint: "Enter amounts as positive numbers and choose Inflow or Outflow." },
    ),
    amountSection(
      "investing",
      "Cash Flows from Investing Activities",
      [
        seed("invOut", "Purchase of equipment", { values: { flow: "Outflow" } }),
        seed("invIn", "Proceeds from sale of equipment", { values: { flow: "Inflow" } }),
      ],
      "Add investing item",
      { columns: [labelCol(), flowCol, amountCol()] },
    ),
    amountSection(
      "financing",
      "Cash Flows from Financing Activities",
      [
        seed("finInvest", "Owner's investment", { values: { flow: "Inflow" } }),
        seed("finLoan", "Proceeds from loans", { values: { flow: "Inflow" } }),
        seed("finRepay", "Loan repayments", { values: { flow: "Outflow" } }),
        seed("finDraw", "Owner's withdrawals", { values: { flow: "Outflow" } }),
      ],
      "Add financing item",
      { columns: [labelCol(), flowCol, amountCol()] },
    ),
    amountSection(
      "beginning",
      "Beginning Cash Balance",
      [seed("beginningCash", "Beginning Cash Balance", { required: true })],
      "Add row",
      { allowNegative: true, hint: "Cash at the start of the period (negative only for an overdraft)." },
    ),
  ],
};

const OWNERS_EQUITY: TemplateDef = {
  type: "OWNERS_EQUITY",
  name: "Statement of Changes in Owner's Equity",
  category: "Core Statements",
  description: "How the owner's capital changed during the period.",
  purpose: "Show changes in the owner's capital during the reporting period.",
  periodMode: "period",
  formulas: [
    "Ending Owner's Equity = Beginning Equity + Additional Investments + Net Profit − Net Loss − Withdrawals ± Other Changes",
    "Enter Net Profit and Net Loss as positive amounts — only one of them should be used.",
  ],
  sections: [
    amountSection(
      "beginning",
      "Beginning Balance",
      [seed("beginningCapital", "Beginning Owner's Capital", { required: true })],
      "Add row",
      { allowNegative: true },
    ),
    amountSection(
      "additions",
      "Additions",
      [seed("investments", "Additional Investments"), seed("netProfit", "Net Profit")],
      "Add addition",
      { hint: "Positive amounts that increase equity." },
    ),
    amountSection(
      "reductions",
      "Reductions",
      [seed("netLoss", "Net Loss"), seed("withdrawals", "Owner's Withdrawals")],
      "Add reduction",
      { hint: "Positive amounts that decrease equity." },
    ),
    amountSection(
      "other",
      "Other Applicable Equity Changes",
      [seed("otherChanges", "Other Equity Changes")],
      "Add change",
      { allowNegative: true, hint: "Signed: positive increases equity, negative decreases it." },
    ),
  ],
};

const TRIAL_BALANCE: TemplateDef = {
  type: "TRIAL_BALANCE",
  name: "Trial Balance",
  category: "Accounting Records",
  description: "Account balances in debit and credit columns, checked for equality.",
  purpose: "List account balances and verify that total debits equal total credits.",
  periodMode: "asOf",
  formulas: [
    "Total Debits = Σ Debit column",
    "Total Credits = Σ Credit column",
    "Difference = Total Debits − Total Credits (balanced when 0)",
    "A balanced trial balance does not prove every transaction was recorded correctly.",
  ],
  sections: [
    {
      id: "accounts",
      title: "Accounts",
      hint: "Rows left completely blank are ignored. Use either Debit or Credit on each account.",
      columns: [
        { id: "code", label: "Account Code (optional)", kind: "text", placeholder: "Code" },
        labelCol("Account Name", "Account name"),
        { id: "debit", label: "Debit (PHP)", kind: "money", placeholder: "0.00" },
        { id: "credit", label: "Credit (PHP)", kind: "money", placeholder: "0.00" },
      ],
      seeds: [
        seed("cash", "Cash"),
        seed("receivable", "Accounts Receivable"),
        seed("inventory", "Inventory"),
        seed("equipment", "Equipment"),
        seed("payable", "Accounts Payable"),
        seed("loans", "Loans Payable"),
        seed("capital", "Owner's Capital"),
        seed("sales", "Sales Revenue"),
        seed("rent", "Rent Expense"),
        seed("salaries", "Salaries Expense"),
        seed("utilities", "Utilities Expense"),
      ],
      addLabel: "Add account",
    },
  ],
};

const COST_OF_GOODS_SOLD: TemplateDef = {
  type: "COST_OF_GOODS_SOLD",
  name: "Cost of Goods Sold Statement",
  category: "Accounting Records",
  description: "Cost of inventory sold by a merchandising business.",
  purpose: "Calculate the cost of inventory sold by a merchandising business.",
  periodMode: "period",
  formulas: [
    "Net Purchases = Purchases − Returns and Allowances − Discounts + Freight-In",
    "Goods Available for Sale = Beginning Inventory + Net Purchases",
    "Cost of Goods Sold = Goods Available for Sale − Ending Inventory",
  ],
  options: [
    {
      id: "inventoryMethod",
      label: "Inventory costing method",
      choices: [
        "Not specified",
        "Periodic – FIFO",
        "Periodic – Weighted Average",
        "Periodic – Specific Identification",
        "Perpetual",
      ],
      default: "Not specified",
      hint: "Shown on the report. You still enter the ending inventory value yourself.",
    },
  ],
  sections: [
    amountSection(
      "beginning",
      "Beginning Inventory",
      [seed("beginningInventory", "Beginning Inventory", { required: true })],
      "Add row",
    ),
    amountSection("purchases", "Purchases", [seed("purchases", "Purchases", { required: true })], "Add purchase row"),
    amountSection(
      "purchaseReductions",
      "Purchase Returns, Allowances and Discounts",
      [
        seed("purchaseReturns", "Purchase Returns and Allowances"),
        seed("purchaseDiscounts", "Purchase Discounts"),
      ],
      "Add reduction",
      { hint: "Positive amounts that reduce purchases." },
    ),
    amountSection(
      "freightIn",
      "Freight-In",
      [seed("freightIn", "Freight-In")],
      "Add freight row",
      { hint: "Transportation cost to bring goods in (if applicable)." },
    ),
    amountSection(
      "ending",
      "Ending Inventory",
      [seed("endingInventory", "Ending Inventory", { required: true })],
      "Add row",
    ),
  ],
};

const invoiceColumns = (partyLabel: string, daysLabel: string, lastComputed: ColumnDef): ColumnDef[] => [
  labelCol(partyLabel, partyLabel),
  { id: "invoiceNo", label: "Invoice Number", kind: "text", required: true, placeholder: "INV-001" },
  { id: "invoiceDate", label: "Invoice Date", kind: "date", required: true },
  { id: "dueDate", label: "Due Date", kind: "date", required: true },
  { id: "original", label: "Original Amount (PHP)", kind: "money", required: true, placeholder: "0.00" },
  { id: "paid", label: "Amount Paid (PHP)", kind: "money", placeholder: "0.00" },
  { id: "outstanding", label: "Outstanding Balance", kind: "money", computed: true },
  { id: "daysPastDue", label: daysLabel, kind: "text", computed: true },
  lastComputed,
];

const AR_AGING: TemplateDef = {
  type: "AR_AGING",
  name: "Accounts Receivable Aging Report",
  category: "Receivables & Payables",
  description: "Unpaid customer invoices grouped by how overdue they are.",
  purpose: "Track unpaid customer invoices and identify overdue accounts.",
  periodMode: "asOf",
  formulas: [
    "Outstanding Balance = Original Invoice Amount − Amount Paid",
    "Days Past Due = Reporting Date − Due Date (0 if not yet due)",
    "Buckets: Current, 1–30, 31–60, 61–90, Over 90 days — measured from the reporting date",
  ],
  sections: [
    {
      id: "invoices",
      title: "Customer Invoices",
      hint: "Aging is measured from the reporting date you choose, not today's date.",
      columns: invoiceColumns("Customer Name", "Days Past Due", {
        id: "bucket",
        label: "Aging Category",
        kind: "text",
        computed: true,
      }),
      seeds: blankSeed(3),
      addLabel: "Add invoice",
    },
  ],
};

const AP_REPORT: TemplateDef = {
  type: "AP_REPORT",
  name: "Accounts Payable Report",
  category: "Receivables & Payables",
  description: "Outstanding amounts owed to suppliers and creditors.",
  purpose: "Track outstanding amounts owed to suppliers and creditors.",
  periodMode: "asOf",
  formulas: [
    "Outstanding Balance = Original Invoice Amount − Amount Paid",
    "Days Overdue = Reporting Date − Due Date (0 if not yet due)",
    "Payment Status: Paid, Partially Paid, Unpaid, or Overdue",
  ],
  sections: [
    {
      id: "invoices",
      title: "Supplier Invoices",
      hint: "Payment status and overdue days are calculated from the reporting date.",
      columns: invoiceColumns("Supplier Name", "Days Overdue", {
        id: "status",
        label: "Payment Status",
        kind: "text",
        computed: true,
      }),
      seeds: blankSeed(3),
      addLabel: "Add supplier invoice",
    },
  ],
};

const BANK_RECONCILIATION: TemplateDef = {
  type: "BANK_RECONCILIATION",
  name: "Bank Reconciliation Statement",
  category: "Cash & Planning",
  description: "Reconcile the bank statement balance with the cash book balance.",
  purpose: "Compare the bank statement balance with the business's cash book balance.",
  periodMode: "asOf",
  formulas: [
    "Adjusted Bank Balance = Bank Statement Balance + Deposits in Transit − Outstanding Checks ± Other Bank-Side Adjustments",
    "Adjusted Book Balance = Cash Book Balance − Unrecorded Bank Fees + Unrecorded Bank Credits ± Other Book-Side Adjustments",
    "Reconciled when the two adjusted balances agree",
  ],
  sections: [
    amountSection(
      "bankBalance",
      "Balance per Bank Statement",
      [seed("bankBalance", "Bank Statement Balance", { required: true })],
      "Add row",
      { allowNegative: true },
    ),
    amountSection(
      "depositsInTransit",
      "Add: Deposits in Transit",
      [seed("dit", "Deposit in transit")],
      "Add deposit",
    ),
    amountSection(
      "outstandingChecks",
      "Less: Outstanding Checks / Payments",
      [seed("osc", "Outstanding check")],
      "Add check",
    ),
    amountSection(
      "bankAdjustments",
      "Other Valid Bank-Side Adjustments (±)",
      [seed("bankAdj", "Other bank-side adjustment (e.g. bank error)")],
      "Add adjustment",
      { allowNegative: true, hint: "Signed: positive increases the bank balance, negative decreases it." },
    ),
    amountSection(
      "bookBalance",
      "Balance per Cash Book",
      [seed("bookBalance", "Cash Book Balance", { required: true })],
      "Add row",
      { allowNegative: true },
    ),
    amountSection(
      "bankFees",
      "Less: Bank Fees Not Yet Recorded",
      [seed("fees", "Bank service charges")],
      "Add fee",
    ),
    amountSection(
      "bankCredits",
      "Add: Interest / Other Bank Credits Not Yet Recorded",
      [seed("credits", "Interest earned")],
      "Add credit",
    ),
    amountSection(
      "bookAdjustments",
      "Other Valid Book-Side Adjustments (±)",
      [seed("bookAdj", "Other book-side adjustment (e.g. NSF check, book error)")],
      "Add adjustment",
      { allowNegative: true, hint: "Signed: positive increases the book balance, negative decreases it." },
    ),
  ],
};

const budgetColumns = (): ColumnDef[] => [
  labelCol("Account Name", "Account name"),
  { id: "budget", label: "Budgeted Amount (PHP)", kind: "money", required: true, placeholder: "0.00" },
  { id: "actual", label: "Actual Amount (PHP)", kind: "money", required: true, placeholder: "0.00" },
  { id: "variance", label: "Variance", kind: "money", computed: true },
  { id: "favorability", label: "Favorability", kind: "text", computed: true },
];

const BUDGET_VS_ACTUAL: TemplateDef = {
  type: "BUDGET_VS_ACTUAL",
  name: "Budget vs. Actual Statement",
  category: "Cash & Planning",
  description: "Planned amounts compared against actual results, with variances.",
  purpose: "Compare planned financial amounts against actual business results.",
  periodMode: "period",
  formulas: [
    "Variance = Actual Amount − Budgeted Amount",
    "Revenue: positive variance is favorable",
    "Expenses: positive variance is unfavorable",
  ],
  sections: [
    {
      id: "revenues",
      title: "Revenue Accounts",
      columns: budgetColumns(),
      seeds: [seed("sales", "Sales Revenue"), seed("otherIncome", "Other Income")],
      addLabel: "Add revenue account",
    },
    {
      id: "expenses",
      title: "Expense Accounts",
      columns: budgetColumns(),
      seeds: [
        seed("cogs", "Cost of Goods Sold"),
        seed("rent", "Rent Expense"),
        seed("salaries", "Salaries Expense"),
        seed("utilities", "Utilities Expense"),
      ],
      addLabel: "Add expense account",
    },
  ],
};

export const TEMPLATES: readonly TemplateDef[] = [
  INCOME_STATEMENT,
  BALANCE_SHEET,
  CASH_FLOW,
  OWNERS_EQUITY,
  TRIAL_BALANCE,
  COST_OF_GOODS_SOLD,
  AR_AGING,
  AP_REPORT,
  BANK_RECONCILIATION,
  BUDGET_VS_ACTUAL,
];

const TEMPLATE_INDEX = new Map<StatementType, TemplateDef>(TEMPLATES.map((t) => [t.type, t]));

export function getTemplate(type: StatementType): TemplateDef {
  const template = TEMPLATE_INDEX.get(type);
  if (!template) throw new Error(`Unknown statement type: ${type}`);
  return template;
}

export function newRowId(): string {
  return `r_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function seedRows(section: SectionDef): StatementRow[] {
  return section.seeds.map((s, index) => ({
    id: `${section.id}_${s.key ?? `row${index}`}`,
    ...(s.key ? { key: s.key } : {}),
    values: Object.fromEntries(
      section.columns.filter((c) => !c.computed).map((c) => [c.id, s.values[c.id] ?? ""]),
    ),
  }));
}

/** A fresh deep copy of a template as student-editable data. */
export function createDefaultData(type: StatementType): StatementData {
  const template = getTemplate(type);
  return {
    meta: {
      businessName: "",
      periodStart: "",
      periodEnd: "",
      asOfDate: "",
      notes: "",
      options: Object.fromEntries((template.options ?? []).map((o) => [o.id, o.default])),
    },
    sections: Object.fromEntries(template.sections.map((s) => [s.id, seedRows(s)])),
  };
}

/** Rebuilds one section's template rows (used by per-section reset in the UI). */
export function createDefaultSectionRows(type: StatementType, sectionId: string): StatementRow[] {
  const section = getTemplate(type).sections.find((s) => s.id === sectionId);
  return section ? seedRows(section) : [];
}
