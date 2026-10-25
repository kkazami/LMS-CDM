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
 * The 4 core financial statement templates. These are code-owned and never written to by
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
      { hint: "Positive amounts that increase equity. Enter Net Profit if the period earned profit (leave Net Loss in Reductions blank)." },
    ),
    amountSection(
      "reductions",
      "Reductions",
      [seed("netLoss", "Net Loss"), seed("withdrawals", "Owner's Withdrawals")],
      "Add reduction",
      { hint: "Positive amounts that decrease equity. Enter Net Loss if the period incurred a loss (leave Net Profit in Additions blank). Unused rows can be left blank." },
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
export const TEMPLATES: readonly TemplateDef[] = [
  INCOME_STATEMENT,
  BALANCE_SHEET,
  CASH_FLOW,
  OWNERS_EQUITY,
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
      preparedByName: "",
      preparedByTitle: "Student / Accounting Preparer",
      approvedByName: "",
      approvedByTitle: "Faculty Instructor / Supervisor",
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
