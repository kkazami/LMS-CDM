import { centsOrZero, formatCents, formatDateText, formatDay, parseDateDay, parseMoney } from "./format";
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
      detail: `Net result ${money(netProfit)} = Gross Profit ${money(grossProfit)} + Other Income ${money(otherIncome)} − Operating Expenses ${money(opex)}.`,
    },
  ];
  if (returns > salesRevenue) {
    checks.push({
      id: "returns-exceed",
      status: "fail",
      label: "Sales returns exceed sales revenue",
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
        detail: balanced
          ? `Both sides total ${money(totalAssets)}.`
          : `Total Assets ${money(totalAssets)} vs Total Liabilities and Equity ${money(totalLE)}. Difference: ${money(difference)}. Your figures were not adjusted.`,
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

  const checks: ReportCheck[] = [];
  if (endingCash < 0) {
    checks.push({
      id: "negative-cash",
      status: "fail",
      label: "Ending cash balance is negative",
      detail: `Ending cash is ${money(endingCash)}. Review your cash inflows, outflows and beginning balance.`,
    });
  } else {
    checks.push({
      id: "cash-roll",
      status: "pass",
      label: "Ending cash reconciles",
      detail: `${money(beginningCash)} + ${money(netChange)} = ${money(endingCash)}.`,
    });
  }

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

  const checks: ReportCheck[] = [];
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
  if (ending < 0) {
    checks.push({
      id: "negative-equity",
      status: "fail",
      label: "Ending owner's equity is negative",
      detail: `Ending equity is ${money(ending)}. Review withdrawals and losses.`,
    });
  }

  return {
    blocks: [{ type: "lines", lines }],
    checks,
    summary: [{ label: "Ending Owner's Equity", cents: ending }],
    figures: { beginning, additions, reductions, other, ending, netProfit, netLoss },
  };
}

function buildTrialBalance(c: Ctx): Built {
  const section = sectionDef(c, "accounts");
  const rows = used(c, "accounts");
  const totalDebits = rows.reduce((a, r) => a + centsOrZero(r.values.debit), 0);
  const totalCredits = rows.reduce((a, r) => a + centsOrZero(r.values.credit), 0);
  const difference = totalDebits - totalCredits;
  const cell = (raw: string | undefined) => {
    const p = parseMoney(raw);
    return p.status === "ok" ? money(p.cents) : "";
  };

  const table: ReportTableBlock = {
    type: "table",
    columns: [
      { label: "Code", align: "left" },
      { label: section.columns[1].label, align: "left" },
      { label: "Debit", align: "right" },
      { label: "Credit", align: "right" },
    ],
    rows: rows.map((r) => [(r.values.code ?? "").trim(), rowName(r), cell(r.values.debit), cell(r.values.credit)]),
    footer: [["", "Totals", money(totalDebits), money(totalCredits)]],
  };
  const balanced = difference === 0;
  return {
    blocks: [table],
    checks: [
      {
        id: "tb-balanced",
        status: balanced ? "pass" : "fail",
        label: balanced ? "Trial balance is balanced" : "Trial balance is NOT balanced",
        detail: balanced
          ? `Total Debits equal Total Credits (${money(totalDebits)}).`
          : `Total Debits ${money(totalDebits)} − Total Credits ${money(totalCredits)} = ${money(difference)}.`,
      },
      {
        id: "tb-caveat",
        status: "info",
        label: "What a balanced trial balance does not prove",
        detail: "Equal totals do not guarantee every transaction was recorded, or recorded in the right account or amount.",
      },
    ],
    summary: [
      { label: "Total Debits", cents: totalDebits },
      { label: "Total Credits", cents: totalCredits },
      { label: "Difference", cents: difference },
    ],
    figures: { totalDebits, totalCredits, difference },
  };
}

function buildCostOfGoodsSold(c: Ctx): Built {
  const beginning = sum(c, "beginning");
  const purchases = sum(c, "purchases");
  const reductions = sum(c, "purchaseReductions");
  const freightIn = sum(c, "freightIn");
  const ending = sum(c, "ending");
  const netPurchases = purchases - reductions + freightIn;
  const goodsAvailable = beginning + netPurchases;
  const cogs = goodsAvailable - ending;

  const lines: ReportLine[] = [
    ...items(c, "beginning").map((l) => ({ ...l, indent: 0 as const })),
    line("heading", "Purchases"),
    ...items(c, "purchases"),
    ...items(c, "purchaseReductions", { prefix: "Less:", negate: true }),
    ...items(c, "freightIn", { prefix: "Add:" }),
    line("subtotal", "Net Purchases", netPurchases),
    line("total", "Goods Available for Sale", goodsAvailable),
    ...items(c, "ending", { prefix: "Less:", negate: true }).map((l) => ({ ...l, indent: 0 as const })),
    line("grand", "Cost of Goods Sold", cogs),
  ];

  const checks: ReportCheck[] = [];
  if (ending > goodsAvailable) {
    checks.push({
      id: "ending-exceeds",
      status: "fail",
      label: "Ending inventory exceeds goods available for sale",
      detail: `Cost of goods sold would be ${money(cogs)}. Review ending inventory and purchases.`,
    });
  } else {
    checks.push({
      id: "cogs-roll",
      status: "pass",
      label: "Cost of goods sold computed",
      detail: `${money(goodsAvailable)} − ${money(ending)} = ${money(cogs)}.`,
    });
  }

  return {
    blocks: [{ type: "lines", lines }],
    checks,
    summary: [
      { label: "Cost of Goods Sold", cents: cogs },
      { label: "Goods Available for Sale", cents: goodsAvailable },
      { label: "Net Purchases", cents: netPurchases },
    ],
    figures: { beginning, netPurchases, goodsAvailable, ending, cogs },
  };
}

// Aging helpers shared by AR and AP.
const BUCKETS = ["Current / Not Yet Due", "1–30 Days", "31–60 Days", "61–90 Days", "Over 90 Days"] as const;

function bucketFor(daysPastDue: number): (typeof BUCKETS)[number] {
  if (daysPastDue <= 0) return BUCKETS[0];
  if (daysPastDue <= 30) return BUCKETS[1];
  if (daysPastDue <= 60) return BUCKETS[2];
  if (daysPastDue <= 90) return BUCKETS[3];
  return BUCKETS[4];
}

function buildInvoiceReport(c: Ctx, mode: "AR" | "AP"): Built {
  const rows = used(c, "invoices");
  const asOf = parseDateDay(c.data.meta.asOfDate);
  const rowComputed: Record<string, Record<string, string>> = {};
  const bucketTotals = new Map<string, number>(BUCKETS.map((b) => [b, 0]));
  let totalOriginal = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;

  const tableRows = rows.map((r) => {
    const original = parseMoney(r.values.original);
    const paid = parseMoney(r.values.paid);
    const originalC = original.status === "ok" ? original.cents : 0;
    const paidC = paid.status === "ok" ? paid.cents : 0;
    const hasOriginal = original.status === "ok";
    const outstanding = originalC - paidC;
    const dueDay = parseDateDay(r.values.dueDate);
    const daysPastDue = asOf !== null && dueDay !== null ? Math.max(0, asOf - dueDay) : null;
    const settled = hasOriginal && outstanding <= 0;

    totalOriginal += originalC;
    totalPaid += paidC;
    totalOutstanding += outstanding;

    let bucket = "—";
    if (settled) bucket = "Paid";
    else if (hasOriginal && daysPastDue !== null) {
      bucket = bucketFor(daysPastDue);
      bucketTotals.set(bucket, (bucketTotals.get(bucket) ?? 0) + outstanding);
      if (daysPastDue > 0) totalOverdue += outstanding;
    }

    let status = "—";
    if (hasOriginal) {
      if (settled) status = "Paid";
      else if (daysPastDue !== null && daysPastDue > 0) status = "Overdue";
      else if (paidC > 0) status = "Partially Paid";
      else status = "Unpaid";
    }

    const daysText = settled ? "0" : daysPastDue === null || !hasOriginal ? "—" : String(daysPastDue);
    rowComputed[r.id] = {
      outstanding: hasOriginal ? money(outstanding) : "—",
      daysPastDue: daysText,
      bucket,
      status,
    };

    const dateText = (raw: string | undefined) => formatDateText(raw) || "";
    return [
      rowName(r),
      (r.values.invoiceNo ?? "").trim(),
      dateText(r.values.invoiceDate),
      dateText(r.values.dueDate),
      hasOriginal ? money(originalC) : "",
      paid.status === "ok" ? money(paidC) : "",
      hasOriginal ? money(outstanding) : "",
      daysText,
      mode === "AR" ? bucket : status,
    ];
  });

  const party = mode === "AR" ? "Customer" : "Supplier";
  const detail: ReportTableBlock = {
    type: "table",
    title: mode === "AR" ? "Customer Invoices" : "Supplier Invoices",
    columns: [
      { label: party, align: "left" },
      { label: "Invoice No.", align: "left" },
      { label: "Invoice Date", align: "left" },
      { label: "Due Date", align: "left" },
      { label: "Original", align: "right" },
      { label: "Paid", align: "right" },
      { label: "Outstanding", align: "right" },
      { label: mode === "AR" ? "Days Past Due" : "Days Overdue", align: "right" },
      { label: mode === "AR" ? "Aging Category" : "Payment Status", align: "left" },
    ],
    rows: tableRows,
    footer: [["Totals", "", "", "", money(totalOriginal), money(totalPaid), money(totalOutstanding), "", ""]],
  };

  const positiveTotal = [...bucketTotals.values()].reduce((a, b) => a + b, 0);
  const aging: ReportTableBlock = {
    type: "table",
    title: mode === "AR" ? "Aging Summary" : "Aging of Unpaid Balances",
    columns: [
      { label: "Category", align: "left" },
      { label: "Outstanding", align: "right" },
      { label: "% of Total", align: "right" },
    ],
    rows: BUCKETS.map((b) => [b, money(bucketTotals.get(b) ?? 0), pct(bucketTotals.get(b) ?? 0, positiveTotal)]),
    footer: [["Total Outstanding", money(positiveTotal), positiveTotal === 0 ? "n/a" : "100.00%"]],
  };

  const figures: Record<string, number> = {
    totalOriginal,
    totalPaid,
    totalOutstanding,
    totalOverdue,
    current: bucketTotals.get(BUCKETS[0]) ?? 0,
    days1to30: bucketTotals.get(BUCKETS[1]) ?? 0,
    days31to60: bucketTotals.get(BUCKETS[2]) ?? 0,
    days61to90: bucketTotals.get(BUCKETS[3]) ?? 0,
    over90: bucketTotals.get(BUCKETS[4]) ?? 0,
  };

  return {
    blocks: [detail, aging],
    checks: [
      {
        id: "aging-basis",
        status: "info",
        label: "Aging reference date",
        detail:
          asOf === null
            ? "Reporting date is not set, so days past due cannot be calculated."
            : `Days ${mode === "AR" ? "past due" : "overdue"} are measured from the reporting date, ${formatDay(asOf)}.`,
      },
    ],
    summary: [
      { label: "Total Outstanding", cents: totalOutstanding },
      { label: "Total Overdue", cents: totalOverdue },
      { label: "Total Invoiced", cents: totalOriginal },
    ],
    figures,
    rowComputed,
  };
}

function buildBankReconciliation(c: Ctx): Built {
  const bank = sum(c, "bankBalance");
  const dit = sum(c, "depositsInTransit");
  const osc = sum(c, "outstandingChecks");
  const bankAdj = sum(c, "bankAdjustments");
  const book = sum(c, "bookBalance");
  const fees = sum(c, "bankFees");
  const credits = sum(c, "bankCredits");
  const bookAdj = sum(c, "bookAdjustments");

  const adjustedBank = bank + dit - osc + bankAdj;
  const adjustedBook = book - fees + credits + bookAdj;
  const difference = adjustedBank - adjustedBook;

  const bankLines: ReportLine[] = [
    ...items(c, "bankBalance").map((l) => ({ ...l, indent: 0 as const })),
    ...items(c, "depositsInTransit", { prefix: "Add:" }),
    ...items(c, "outstandingChecks", { prefix: "Less:", negate: true }),
    ...items(c, "bankAdjustments"),
    line("grand", "Adjusted Bank Balance", adjustedBank),
  ];
  const bookLines: ReportLine[] = [
    ...items(c, "bookBalance").map((l) => ({ ...l, indent: 0 as const })),
    ...items(c, "bankFees", { prefix: "Less:", negate: true }),
    ...items(c, "bankCredits", { prefix: "Add:" }),
    ...items(c, "bookAdjustments"),
    line("grand", "Adjusted Book Balance", adjustedBook),
  ];

  const agree = difference === 0;
  return {
    blocks: [
      { type: "lines", title: "Balance per Bank Statement", lines: bankLines },
      { type: "lines", title: "Balance per Cash Book", lines: bookLines },
    ],
    checks: [
      {
        id: "br-agree",
        status: agree ? "pass" : "fail",
        label: agree ? "Adjusted balances agree" : "Adjusted balances do not agree",
        detail: agree
          ? `Both adjusted balances are ${money(adjustedBank)}.`
          : `Adjusted Bank Balance ${money(adjustedBank)} vs Adjusted Book Balance ${money(adjustedBook)}. Difference: ${money(difference)}. Review your entries — nothing was forced to match.`,
      },
    ],
    summary: [
      { label: "Adjusted Bank Balance", cents: adjustedBank },
      { label: "Adjusted Book Balance", cents: adjustedBook },
      { label: "Difference", cents: difference },
    ],
    figures: { adjustedBank, adjustedBook, difference },
  };
}

function buildBudgetVsActual(c: Ctx): Built {
  const rowComputed: Record<string, Record<string, string>> = {};

  const makeTable = (id: "revenues" | "expenses") => {
    const revenue = id === "revenues";
    const rows = used(c, id);
    let budgetTotal = 0;
    let actualTotal = 0;
    const favorability = (variance: number) =>
      variance === 0 ? "On budget" : (variance > 0) === revenue ? "Favorable" : "Unfavorable";

    const body = rows.map((r) => {
      const budget = parseMoney(r.values.budget);
      const actual = parseMoney(r.values.actual);
      const b = budget.status === "ok" ? budget.cents : 0;
      const a = actual.status === "ok" ? actual.cents : 0;
      budgetTotal += b;
      actualTotal += a;
      const both = budget.status === "ok" && actual.status === "ok";
      const variance = a - b;
      rowComputed[r.id] = {
        variance: both ? money(variance) : "—",
        favorability: both ? favorability(variance) : "—",
      };
      return [
        rowName(r),
        budget.status === "ok" ? money(b) : "",
        actual.status === "ok" ? money(a) : "",
        both ? money(variance) : "",
        both ? pct(variance, b) : "",
        both ? favorability(variance) : "",
      ];
    });
    const totalVariance = actualTotal - budgetTotal;
    const table: ReportTableBlock = {
      type: "table",
      title: revenue ? "Revenue" : "Expenses",
      columns: [
        { label: "Account", align: "left" },
        { label: "Budgeted", align: "right" },
        { label: "Actual", align: "right" },
        { label: "Variance", align: "right" },
        { label: "Variance %", align: "right" },
        { label: "Favorability", align: "left" },
      ],
      rows: body,
      footer: [
        [
          revenue ? "Total Revenue" : "Total Expenses",
          money(budgetTotal),
          money(actualTotal),
          money(totalVariance),
          pct(totalVariance, budgetTotal),
          favorability(totalVariance),
        ],
      ],
    };
    return { table, budgetTotal, actualTotal };
  };

  const rev = makeTable("revenues");
  const exp = makeTable("expenses");
  const netBudget = rev.budgetTotal - exp.budgetTotal;
  const netActual = rev.actualTotal - exp.actualTotal;
  const netVariance = netActual - netBudget;
  const netFav = netVariance === 0 ? "On budget" : netVariance > 0 ? "Favorable" : "Unfavorable";

  const net: ReportTableBlock = {
    type: "table",
    title: "Net Result (Revenue − Expenses)",
    columns: [
      { label: "", align: "left" },
      { label: "Budgeted", align: "right" },
      { label: "Actual", align: "right" },
      { label: "Variance", align: "right" },
      { label: "Variance %", align: "right" },
      { label: "Favorability", align: "left" },
    ],
    rows: [["Net Income", money(netBudget), money(netActual), money(netVariance), pct(netVariance, Math.abs(netBudget)), netFav]],
  };

  return {
    blocks: [rev.table, exp.table, net],
    checks: [
      {
        id: "variance-rule",
        status: "info",
        label: "How favorability is determined",
        detail:
          "Variance = Actual − Budget. For revenue, a positive variance is favorable. For expenses, a positive variance is unfavorable.",
      },
    ],
    summary: [
      { label: "Net Income Variance", cents: netVariance },
      { label: "Total Budgeted Revenue", cents: rev.budgetTotal },
      { label: "Total Actual Revenue", cents: rev.actualTotal },
    ],
    figures: {
      revBudget: rev.budgetTotal,
      revActual: rev.actualTotal,
      expBudget: exp.budgetTotal,
      expActual: exp.actualTotal,
      netBudget,
      netActual,
      netVariance,
    },
    rowComputed,
  };
}

const BUILDERS: Record<StatementType, (c: Ctx) => Built> = {
  INCOME_STATEMENT: buildIncomeStatement,
  BALANCE_SHEET: buildBalanceSheet,
  CASH_FLOW: buildCashFlow,
  OWNERS_EQUITY: buildOwnersEquity,
  TRIAL_BALANCE: buildTrialBalance,
  COST_OF_GOODS_SOLD: buildCostOfGoodsSold,
  AR_AGING: (c) => buildInvoiceReport(c, "AR"),
  AP_REPORT: (c) => buildInvoiceReport(c, "AP"),
  BANK_RECONCILIATION: buildBankReconciliation,
  BUDGET_VS_ACTUAL: buildBudgetVsActual,
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
      options: (def.options ?? []).map((o) => ({ label: o.label, value: data.meta.options[o.id] ?? o.default })),
    },
    rowComputed: built.rowComputed ?? {},
    sectionTotals,
    figures: built.figures,
  };
}
