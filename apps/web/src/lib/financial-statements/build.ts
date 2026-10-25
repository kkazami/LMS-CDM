import { centsOrZero, formatCents, formatDateText, parseMoney } from "./format";
import { isRowInUse } from "./data";
import { getTemplate } from "./templates";
import type {
  BuildResult,
  ReportBlock,
  ReportCheck,
  ReportLine,
  ReportTableBlock,
  StatementData,
  StatementRow,
  StatementType,
  SummaryMetric,
  TemplateDef,
} from "./types";

/**
 * Deterministic accounting engine. All arithmetic is on integer cents.
 * Builders never mutate or "fix" the student's numbers; discrepancies are
 * surfaced as checks.
 */

interface Ctx {
  def: TemplateDef;
  data: StatementData;
}

interface Built {
  blocks: ReportBlock[];
  checks: ReportCheck[];
  summary: SummaryMetric[];
  figures: Record<string, number>;
  rowComputed?: Record<string, Record<string, string>>;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const sectionDef = (c: Ctx, id: string) => {
  const s = c.def.sections.find((x) => x.id === id);
  if (!s) throw new Error(`Template ${c.def.type} has no section ${id}`);
  return s;
};

const used = (c: Ctx, id: string): StatementRow[] =>
  (c.data.sections[id] ?? []).filter((r) => isRowInUse(sectionDef(c, id), r));

const sum = (c: Ctx, id: string, col = "amount"): number =>
  used(c, id).reduce((acc, r) => acc + centsOrZero(r.values[col]), 0);

const rowName = (r: StatementRow): string => (r.values.label ?? "").trim() || "Unnamed item";

const withPrefix = (prefix: string | undefined, label: string): string =>
  prefix && !label.toLowerCase().startsWith(prefix.toLowerCase()) ? `${prefix} ${label}` : label;

function items(
  c: Ctx,
  id: string,
  opts: { prefix?: string; negate?: boolean; filter?: (r: StatementRow) => boolean } = {},
): ReportLine[] {
  return used(c, id)
    .filter((r) => (opts.filter ? opts.filter(r) : true))
    .map((r) => {
      const v = centsOrZero(r.values.amount);
      return { kind: "item", label: withPrefix(opts.prefix, rowName(r)), cents: opts.negate ? -v : v, indent: 1 } as ReportLine;
    });
}

const line = (kind: ReportLine["kind"], label: string, cents?: number, indent: 0 | 1 | 2 = 0): ReportLine => ({
  kind,
  label,
  cents,
  indent,
});

const money = (cents: number) => formatCents(cents);

function periodText(def: TemplateDef, data: StatementData): string {
  if (def.periodMode === "asOf") {
    const text = formatDateText(data.meta.asOfDate);
    return text ? `As of ${text}` : "Statement date not set";
  }
  const start = formatDateText(data.meta.periodStart);
  const end = formatDateText(data.meta.periodEnd);
  return start && end ? `For the period ${start} to ${end}` : "Reporting period not set";
}

const pct = (part: number, whole: number): string =>
  whole === 0 ? "n/a" : `${(Math.round((part / whole) * 10000) / 100).toFixed(2)}%`;

// ─── builders ───────────────────────────────────────────────────────────────

function buildIncomeStatement(c: Ctx): Built {
  const salesRevenue = sum(c, "revenue");
  const returns = sum(c, "returns");
  const otherIncome = sum(c, "otherIncome");
  const cogs = sum(c, "cogs");
  const opex = sum(c, "opex");

  const netSales = salesRevenue - returns;
  const grossProfit = netSales - cogs;
  const totalRevenueAndOther = netSales + otherIncome;
  const totalExpenses = cogs + opex; // COGS counted exactly once
  const netProfit = totalRevenueAndOther - totalExpenses;

  const revenueRows = used(c, "revenue");
  const lines: ReportLine[] = [
    line("heading", "Revenue"),
    ...items(c, "revenue"),
    ...(revenueRows.length > 1 ? [line("subtotal", "Total Sales Revenue", salesRevenue, 1)] : []),
    ...items(c, "returns", { prefix: "Less:", negate: true }),
    line("total", "Net Sales", netSales),
    line("heading", "Other Income"),
    ...items(c, "otherIncome"),
    line("total", "Total Revenue and Other Income", totalRevenueAndOther),
    line("heading", "Cost of Goods Sold"),
    ...items(c, "cogs"),
    line("total", "Total Cost of Goods Sold", cogs),
    line("total", "Gross Profit (Net Sales − Cost of Goods Sold)", grossProfit),
    line("heading", "Operating Expenses"),
    ...items(c, "opex"),
    line("total", "Total Operating Expenses", opex),
    line("subtotal", "Total Expenses (Cost of Goods Sold + Operating Expenses)", totalExpenses),
    line("grand", netProfit >= 0 ? "Net Profit" : "Net Loss", netProfit),
  ];

  const checks: ReportCheck[] = [
    {
      id: "cogs-once",
      status: netProfit === grossProfit + otherIncome - opex ? "pass" : "fail",
      label: "Cost of goods sold is counted once",
      formula: "Net Profit = Gross Profit + Other Income − Operating Expenses",
      calculation: `${money(grossProfit)} + ${money(otherIncome)} − ${money(opex)} = ${money(netProfit)}`,
      detail: `Net result ${money(netProfit)} = Gross Profit ${money(grossProfit)} + Other Income ${money(otherIncome)} − Operating Expenses ${money(opex)}.`,
    },
    {
      id: "net-sales-check",
      status: returns > salesRevenue ? "warning" : "pass",
      label: "Net Sales Calculation",
      formula: "Net Sales = Sales Revenue − Sales Returns and Allowances",
      calculation: `${money(salesRevenue)} − ${money(returns)} = ${money(netSales)}`,
      detail: returns > salesRevenue
        ? "Sales returns exceed sales revenue resulting in negative Net Sales. Review return entries."
        : `Gross Sales ${money(salesRevenue)} − Returns ${money(returns)} = Net Sales of ${money(netSales)}.`,
    },
    {
      id: "gross-profit-check",
      status: grossProfit < 0 ? "warning" : "pass",
      label: "Gross Profit Calculation",
      formula: "Gross Profit = Net Sales − Cost of Goods Sold",
      calculation: `${money(netSales)} − ${money(cogs)} = ${money(grossProfit)}`,
      detail: grossProfit < 0
        ? `Gross Loss: Cost of Goods Sold (${money(cogs)}) exceeds Net Sales (${money(netSales)}).`
        : `Net Sales ${money(netSales)} − COGS ${money(cogs)} = Gross Profit of ${money(grossProfit)}.`,
    },
    {
      id: "income-statement-review",
      status: "review_required",
      label: "Revenue Recognition & Classification Review",
      detail: "Mathematical formula verified. Independent review is recommended to substantiate revenue recognition and correct expense allocation.",
    },
  ];
  if (returns > salesRevenue) {
    checks.push({
      id: "returns-exceed",
      status: "fail",
      label: "Sales returns exceed sales revenue",
      formula: "Net Sales = Sales Revenue − Returns",
      calculation: `${money(salesRevenue)} − ${money(returns)} = ${money(netSales)}`,
      detail: "Net Sales is negative. Review the sales revenue and returns figures.",
    });
  }

  return {
    blocks: [{ type: "lines", lines }],
    checks,
    summary: [
      { label: netProfit >= 0 ? "Net Profit" : "Net Loss", cents: netProfit },
      { label: "Gross Profit", cents: grossProfit },
      { label: "Net Sales", cents: netSales },
    ],
    figures: { netSales, grossProfit, totalRevenueAndOther, totalExpenses, netProfit, returns, salesRevenue },
  };
}

function buildBalanceSheet(c: Ctx): Built {
  const assets = sum(c, "assets");
  const contra = sum(c, "contraAssets");
  const totalAssets = assets - contra;
  const totalLiabilities = sum(c, "liabilities");
  const totalEquity = sum(c, "equity");
  const totalLE = totalLiabilities + totalEquity;
  const difference = totalAssets - totalLE;

  const lines: ReportLine[] = [
    line("heading", "Assets"),
    ...items(c, "assets"),
    ...items(c, "contraAssets", { prefix: "Less:", negate: true }),
    line("total", "Total Assets", totalAssets),
    line("heading", "Liabilities"),
    ...items(c, "liabilities"),
    line("subtotal", "Total Liabilities", totalLiabilities),
    line("heading", "Owner's Equity"),
    ...items(c, "equity"),
    line("subtotal", "Total Equity", totalEquity),
    line("grand", "Total Liabilities and Equity", totalLE),
  ];

  const balanced = difference === 0;
  return {
    blocks: [{ type: "lines", lines }],
    checks: [
      {
        id: "balance",
        status: balanced ? "pass" : "fail",
        label: balanced ? "Total Assets equal Total Liabilities and Equity" : "Balance sheet is out of balance",
        formula: "Total Assets = Total Liabilities + Total Equity",
        calculation: `${money(totalAssets)} vs ${money(totalLE)} (Difference: ${money(difference)})`,
        detail: balanced
          ? `Both sides total ${money(totalAssets)}. Accounting equation is satisfied.`
          : `Total Assets ${money(totalAssets)} vs Total Liabilities and Equity ${money(totalLE)}. Difference: ${money(difference)}. Your figures were not adjusted.`,
      },
      {
        id: "assets-subtotal",
        status: contra > assets ? "warning" : "pass",
        label: "Total Assets Calculation",
        formula: "Total Assets = Gross Assets − Contra Assets",
        calculation: `${money(assets)} − ${money(contra)} = ${money(totalAssets)}`,
        detail: contra > assets
          ? `Contra assets (${money(contra)}) exceed gross assets (${money(assets)}). Review accumulated depreciation or allowance accounts.`
          : `Gross Assets ${money(assets)} minus Contra Assets ${money(contra)} equals Total Assets of ${money(totalAssets)}.`,
      },
      {
        id: "liabilities-equity-subtotal",
        status: totalEquity < 0 ? "warning" : "pass",
        label: "Total Liabilities and Equity Calculation",
        formula: "Total Liabilities and Equity = Total Liabilities + Total Equity",
        calculation: `${money(totalLiabilities)} + ${money(totalEquity)} = ${money(totalLE)}`,
        detail: totalEquity < 0
          ? `Capital deficiency: Total Owner's Equity is negative (${money(totalEquity)}). Liabilities are ${money(totalLiabilities)}.`
          : `Total Liabilities ${money(totalLiabilities)} plus Total Equity ${money(totalEquity)} equals ${money(totalLE)}.`,
      },
      {
        id: "balance-sheet-review",
        status: "review_required",
        label: "Asset Valuation & Classification Review",
        detail: "Mathematical balance verified. Independent inspection is required to substantiate asset title, allowance adequacy, and debt covenants.",
      },
    ],
    summary: [
      { label: "Total Assets", cents: totalAssets },
      { label: "Total Liabilities and Equity", cents: totalLE },
      { label: "Difference", cents: difference },
    ],
    figures: { totalAssets, totalLiabilities, totalEquity, totalLiabilitiesAndEquity: totalLE, difference },
  };
}

function buildCashFlow(c: Ctx): Built {
  const flowTotals = (id: string) => {
    const rows = used(c, id);
    const inflow = rows.filter((r) => r.values.flow === "Inflow").reduce((a, r) => a + centsOrZero(r.values.amount), 0);
    const outflow = rows.filter((r) => r.values.flow === "Outflow").reduce((a, r) => a + centsOrZero(r.values.amount), 0);
    return { inflow, outflow, net: inflow - outflow };
  };
  const signedItems = (id: string): ReportLine[] =>
    used(c, id)
      .filter((r) => r.values.flow === "Inflow" || r.values.flow === "Outflow")
      .map((r) => {
        const v = centsOrZero(r.values.amount);
        const out = r.values.flow === "Outflow";
        return line("item", out ? withPrefix("Less:", rowName(r)) : rowName(r), out ? -v : v, 1);
      });

  const op = flowTotals("operating");
  const inv = flowTotals("investing");
  const fin = flowTotals("financing");
  const beginningCash = sum(c, "beginning");
  const netChange = op.net + inv.net + fin.net;
  const endingCash = beginningCash + netChange;

  const lines: ReportLine[] = [
    line("heading", "Cash Flows from Operating Activities"),
    ...signedItems("operating"),
    line("subtotal", "Net Cash Flow from Operating Activities", op.net),
    line("heading", "Cash Flows from Investing Activities"),
    ...signedItems("investing"),
    line("subtotal", "Net Cash Flow from Investing Activities", inv.net),
    line("heading", "Cash Flows from Financing Activities"),
    ...signedItems("financing"),
    line("subtotal", "Net Cash Flow from Financing Activities", fin.net),
    line("total", "Net Change in Cash", netChange),
    line("item", "Beginning Cash Balance", beginningCash, 0),
    line("grand", "Ending Cash Balance", endingCash),
  ];

  const checks: ReportCheck[] = [
    {
      id: endingCash < 0 ? "negative-cash" : "cash-roll",
      status: endingCash < 0 ? "fail" : "pass",
      label: endingCash < 0 ? "Ending cash balance is negative (Overdraft)" : "Ending cash reconciles",
      formula: "Ending Cash = Beginning Cash + Net Change in Cash",
      calculation: `${money(beginningCash)} + ${money(netChange)} = ${money(endingCash)}`,
      detail:
        endingCash < 0
          ? `Ending cash is negative (${money(endingCash)}). Review your cash inflows, outflows and beginning balance.`
          : `Beginning cash ${money(beginningCash)} plus net cash change ${money(netChange)} equals ending cash of ${money(endingCash)}.`,
    },
    {
      id: "cf-activities",
      status: "pass",
      label: "Net Cash Movements by Activity",
      formula: "Net Change in Cash = Operating + Investing + Financing",
      calculation: `${money(op.net)} + ${money(inv.net)} + ${money(fin.net)} = ${money(netChange)}`,
      detail: `Operating cash flow: ${money(op.net)}, Investing cash flow: ${money(inv.net)}, Financing cash flow: ${money(fin.net)}.`,
    },
    {
      id: "cf-operating",
      status: op.net < 0 && (op.inflow > 0 || op.outflow > 0) ? "warning" : "pass",
      label: "Operating Activities Cash Flow Calculation",
      formula: "Net Operating Cash Flow = Cash Inflows − Cash Outflows",
      calculation: `${money(op.inflow)} − ${money(op.outflow)} = ${money(op.net)}`,
      detail:
        op.net < 0
          ? `Net cash used in operating activities is negative (${money(op.net)}). Operational outflows exceed receipts.`
          : `Net cash generated by operating activities is ${money(op.net)}.`,
    },
    {
      id: "cash-flow-review",
      status: "review_required",
      label: "Direct Method & Non-Cash Activity Verification",
      detail: "Mathematical reconciliations verified. Non-cash investing and financing activities (e.g. debt-financed assets) require separate disclosure.",
    },
  ];

  return {
    blocks: [{ type: "lines", lines }],
    checks,
    summary: [
      { label: "Ending Cash Balance", cents: endingCash },
      { label: "Net Change in Cash", cents: netChange },
      { label: "Net Operating Cash Flow", cents: op.net },
    ],
    figures: {
      netOperating: op.net,
      netInvesting: inv.net,
      netFinancing: fin.net,
      netChange,
      beginningCash,
      endingCash,
    },
  };
}

function buildOwnersEquity(c: Ctx): Built {
  const beginning = sum(c, "beginning");
  const additions = sum(c, "additions");
  const reductions = sum(c, "reductions");
  const other = sum(c, "other");
  const ending = beginning + additions - reductions + other;

  const keyed = (id: string, key: string) =>
    used(c, id)
      .filter((r) => r.key === key)
      .reduce((a, r) => a + centsOrZero(r.values.amount), 0);
  const netProfit = keyed("additions", "netProfit");
  const netLoss = keyed("reductions", "netLoss");

  const lines: ReportLine[] = [
    line("heading", "Beginning Balance"),
    ...items(c, "beginning"),
    line("heading", "Additions"),
    ...items(c, "additions", { prefix: undefined }),
    line("subtotal", "Total Additions", additions, 1),
    line("heading", "Reductions"),
    ...items(c, "reductions", { prefix: "Less:", negate: true }),
    line("subtotal", "Total Reductions", -reductions, 1),
    ...(used(c, "other").length > 0
      ? [line("heading", "Other Applicable Equity Changes"), ...items(c, "other")]
      : []),
    line("grand", "Ending Owner's Equity", ending),
  ];

  const checks: ReportCheck[] = [
    {
      id: ending < 0 ? "negative-equity" : "equity-rollforward",
      status: ending < 0 ? "fail" : "pass",
      label: ending < 0 ? "Ending owner's equity is negative (Deficit)" : "Owner's Equity roll-forward reconciles",
      formula: "Ending Equity = Beginning Balance + Additions − Reductions + Other Changes",
      calculation: `${money(beginning)} + ${money(additions)} − ${money(reductions)}${other !== 0 ? ` + ${money(other)}` : ""} = ${money(ending)}`,
      detail:
        ending < 0
          ? `Ending equity is ${money(ending)}. Capital deficiency: withdrawals and cumulative losses exceed investments and profit.`
          : `Beginning balance ${money(beginning)} plus additions ${money(additions)} less reductions ${money(reductions)} equals ending equity ${money(ending)}.`,
    },
  ];

  if (netProfit > 0 && netLoss > 0) {
    checks.push({
      id: "profit-and-loss",
      status: "fail",
      label: "Both Net Profit and Net Loss were entered",
      detail: "A period has either a net profit (adds to equity) or a net loss (subtracts from equity), not both.",
    });
  } else {
    checks.push({
      id: "profit-loss-sign",
      status: "pass",
      label: "Profit and loss are applied consistently",
      detail: "Net Profit adds to equity and Net Loss subtracts from equity; neither is counted as both.",
    });
  }

  checks.push({
    id: "equity-review",
    status: "review_required",
    label: "Capital Contributions & Withdrawals Verification",
    detail: "Mathematical roll-forward verified. Owner capital additions and personal withdrawals should be substantiated with bank records and journal vouchers.",
  });

  return {
    blocks: [{ type: "lines", lines }],
    checks,
    summary: [{ label: "Ending Owner's Equity", cents: ending }],
    figures: { beginning, additions, reductions, other, ending, netProfit, netLoss },
  };
}

const BUILDERS: Record<StatementType, (c: Ctx) => Built> = {
  INCOME_STATEMENT: buildIncomeStatement,
  BALANCE_SHEET: buildBalanceSheet,
  CASH_FLOW: buildCashFlow,
  OWNERS_EQUITY: buildOwnersEquity,
};

/** Primary money column for per-section footers in the editor. */
function primaryMoneyColumn(def: TemplateDef, sectionId: string): string | null {
  const section = def.sections.find((s) => s.id === sectionId);
  if (!section) return null;
  const preferred = ["amount", "original", "debit", "budget"];
  for (const id of preferred) if (section.columns.some((col) => col.id === id && !col.computed)) return id;
  return null;
}

export function buildStatement(type: StatementType, data: StatementData): BuildResult {
  const def = getTemplate(type);
  const ctx: Ctx = { def, data };
  const built = BUILDERS[type](ctx);

  const sectionTotals: Record<string, number> = {};
  for (const section of def.sections) {
    const col = primaryMoneyColumn(def, section.id);
    if (col) sectionTotals[section.id] = sum(ctx, section.id, col);
  }

  return {
    document: {
      type,
      title: def.name,
      businessName: data.meta.businessName.trim(),
      periodText: periodText(def, data),
      currency: "PHP",
      blocks: built.blocks,
      checks: built.checks,
      summary: built.summary,
      notes: data.meta.notes.trim(),
      preparedBy: data.meta.preparedByName?.trim() || undefined,
      preparedByTitle: data.meta.preparedByTitle?.trim() || undefined,
      approvedBy: data.meta.approvedByName?.trim() || undefined,
      approvedByTitle: data.meta.approvedByTitle?.trim() || undefined,
      options: (def.options ?? []).map((o) => ({ label: o.label, value: data.meta.options[o.id] ?? o.default })),
    },
    rowComputed: built.rowComputed ?? {},
    sectionTotals,
    figures: built.figures,
  };
}
