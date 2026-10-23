import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStatement } from "../../apps/web/src/lib/financial-statements/build";
import { normalizeData } from "../../apps/web/src/lib/financial-statements/data";
import { centsOrZero, formatCents, parseDateDay, parseMoney } from "../../apps/web/src/lib/financial-statements/format";
import { renderStatementPdf } from "../../apps/web/src/lib/financial-statements/pdf";
import { TEMPLATES, createDefaultData, getTemplate } from "../../apps/web/src/lib/financial-statements/templates";
import { STATEMENT_TYPES, type StatementData, type StatementType } from "../../apps/web/src/lib/financial-statements/types";
import { hasBlockingErrors, validateStatement } from "../../apps/web/src/lib/financial-statements/validate";

// ── helpers ────────────────────────────────────────────────────────────────
function fresh(type: StatementType, meta: Partial<StatementData["meta"]> = {}): StatementData {
  const data = createDefaultData(type);
  const template = getTemplate(type);
  data.meta.businessName = "Sampaguita Trading";
  if (template.periodMode === "period") {
    data.meta.periodStart = "2026-01-01";
    data.meta.periodEnd = "2026-12-31";
  } else {
    data.meta.asOfDate = "2026-06-30";
  }
  Object.assign(data.meta, meta);
  return data;
}

/** Sets cells on the seeded row identified by key. */
function set(data: StatementData, sectionId: string, key: string, values: Record<string, string>) {
  const row = data.sections[sectionId].find((r) => r.key === key);
  assert.ok(row, `row ${sectionId}.${key} exists`);
  Object.assign(row.values, values);
}

let counter = 0;
function add(data: StatementData, sectionId: string, values: Record<string, string>) {
  data.sections[sectionId].push({ id: `t${(counter += 1)}`, values });
}

const errors = (type: StatementType, data: StatementData) =>
  validateStatement(type, data).filter((i) => i.severity === "error");

// ── money / dates ──────────────────────────────────────────────────────────
test("parseMoney is exact and strict", () => {
  assert.deepEqual(parseMoney("1,234.56"), { status: "ok", cents: 123456 });
  assert.deepEqual(parseMoney("0.1"), { status: "ok", cents: 10 });
  assert.deepEqual(parseMoney("-12"), { status: "ok", cents: -1200 });
  assert.deepEqual(parseMoney(".5"), { status: "ok", cents: 50 });
  assert.deepEqual(parseMoney(""), { status: "empty" });
  assert.deepEqual(parseMoney("12.345"), { status: "invalid", reason: "decimals" });
  assert.deepEqual(parseMoney("abc"), { status: "invalid", reason: "format" });
  assert.deepEqual(parseMoney("1e5"), { status: "invalid", reason: "format" });
  assert.deepEqual(parseMoney("9999999999999"), { status: "invalid", reason: "range" });
  // 0.1 + 0.2 never drifts because everything is integer cents
  assert.equal(centsOrZero("0.1") + centsOrZero("0.2"), 30);
  assert.equal(formatCents(-123456), "(1,234.56)");
  assert.equal(formatCents(5), "0.05");
});

test("parseDateDay rejects impossible dates", () => {
  assert.equal(parseDateDay("2026-02-30"), null);
  assert.equal(parseDateDay("2026-13-01"), null);
  assert.equal(parseDateDay("26-01-01"), null);
  assert.notEqual(parseDateDay("2028-02-29"), null);
  assert.equal(parseDateDay("2026-03-01")! - parseDateDay("2026-02-28")!, 1);
});

// ── templates ──────────────────────────────────────────────────────────────
test("all 10 templates exist, build, and start with blank (never invented) amounts", () => {
  assert.equal(TEMPLATES.length, 10);
  assert.equal(new Set(TEMPLATES.map((t) => t.type)).size, 10);
  for (const type of STATEMENT_TYPES) {
    const data = createDefaultData(type);
    for (const rows of Object.values(data.sections)) {
      for (const row of rows) {
        for (const [col, value] of Object.entries(row.values)) {
          if (["amount", "debit", "credit", "original", "paid", "budget", "actual"].includes(col)) assert.equal(value, "");
        }
      }
    }
    const built = buildStatement(type, data);
    assert.equal(built.document.type, type);
    // A blank statement must not be generatable.
    assert.ok(hasBlockingErrors(validateStatement(type, data)), `${type} blank draft is blocked`);
  }
});

test("editing a student copy never mutates the shared template or another draft", () => {
  const a = createDefaultData("INCOME_STATEMENT");
  a.sections.revenue[0].values.amount = "999";
  a.sections.revenue[0].values.label = "Changed";
  a.sections.revenue.push({ id: "extra", values: { label: "x", amount: "1" } });
  const b = createDefaultData("INCOME_STATEMENT");
  assert.equal(b.sections.revenue[0].values.amount, "");
  assert.equal(b.sections.revenue[0].values.label, "Sales Revenue");
  assert.equal(b.sections.revenue.length, 1);
  assert.equal(getTemplate("INCOME_STATEMENT").sections[0].seeds[0].values.label, "Sales Revenue");
});

// ── 1. Income statement ────────────────────────────────────────────────────
test("income statement: formulas and no double-subtraction", () => {
  const d = fresh("INCOME_STATEMENT");
  set(d, "revenue", "salesRevenue", { amount: "100000" });
  set(d, "returns", "salesReturns", { amount: "5000" });
  set(d, "otherIncome", "otherIncome", { amount: "2000" });
  set(d, "cogs", "cogs", { amount: "40000" });
  set(d, "opex", "rent", { amount: "10000" });
  set(d, "opex", "salaries", { amount: "20000" });
  set(d, "opex", "utilities", { amount: "3000" });
  set(d, "opex", "depreciation", { amount: "1000" });
  set(d, "opex", "otherExpenses", { amount: "500" });
  assert.equal(errors("INCOME_STATEMENT", d).length, 0);
  const { figures } = buildStatement("INCOME_STATEMENT", d);
  assert.equal(figures.netSales, 9_500_000);
  assert.equal(figures.grossProfit, 5_500_000);
  assert.equal(figures.totalRevenueAndOther, 9_700_000);
  assert.equal(figures.totalExpenses, 7_450_000); // COGS 40,000 once + opex 34,500
  assert.equal(figures.netProfit, 2_250_000);
});

test("income statement: net loss and requirement of Sales Revenue", () => {
  const d = fresh("INCOME_STATEMENT");
  assert.ok(errors("INCOME_STATEMENT", d).some((e) => /Sales Revenue is required/.test(e.message)));
  set(d, "revenue", "salesRevenue", { amount: "1000" });
  set(d, "opex", "rent", { amount: "1500.50" });
  assert.equal(buildStatement("INCOME_STATEMENT", d).figures.netProfit, -50_050);
});

// ── 2. Balance sheet ───────────────────────────────────────────────────────
test("balance sheet: contra-asset, balance check, imbalance is displayed not corrected", () => {
  const d = fresh("BALANCE_SHEET");
  set(d, "assets", "cash", { amount: "50000" });
  set(d, "assets", "receivable", { amount: "20000" });
  set(d, "assets", "equipment", { amount: "30000" });
  set(d, "contraAssets", "accumDep", { amount: "5000" });
  set(d, "liabilities", "payable", { amount: "15000" });
  set(d, "liabilities", "loans", { amount: "30000" });
  set(d, "equity", "capital", { amount: "40000" });
  set(d, "equity", "retained", { amount: "10000" });
  let r = buildStatement("BALANCE_SHEET", d);
  assert.equal(r.figures.totalAssets, 9_500_000);
  assert.equal(r.figures.totalLiabilitiesAndEquity, 9_500_000);
  assert.equal(r.document.checks[0].status, "pass");

  set(d, "equity", "retained", { amount: "9000" });
  r = buildStatement("BALANCE_SHEET", d);
  assert.equal(r.figures.difference, 100_000);
  assert.equal(r.document.checks[0].status, "fail");
  assert.equal(r.figures.totalEquity, 4_900_000, "figures were not forced to balance");
  const issues = validateStatement("BALANCE_SHEET", d);
  assert.equal(hasBlockingErrors(issues), false, "imbalance warns but does not block");
  assert.ok(issues.some((i) => i.severity === "warning" && /out of balance/i.test(i.message)));
});

test("balance sheet: negatives only where appropriate", () => {
  const d = fresh("BALANCE_SHEET");
  set(d, "assets", "cash", { amount: "-5" });
  assert.ok(errors("BALANCE_SHEET", d).some((e) => /cannot be negative/.test(e.message)));
  const e = fresh("BALANCE_SHEET");
  set(e, "assets", "cash", { amount: "5" });
  set(e, "equity", "retained", { amount: "-100" });
  assert.equal(errors("BALANCE_SHEET", e).length, 0);
});

// ── 3. Cash flow ───────────────────────────────────────────────────────────
test("cash flow: nets per activity and ending cash", () => {
  const d = fresh("CASH_FLOW");
  set(d, "beginning", "beginningCash", { amount: "10000" });
  set(d, "operating", "opIn", { amount: "80000" });
  set(d, "operating", "opOutSuppliers", { amount: "30000" });
  set(d, "operating", "opOutSalaries", { amount: "15000" });
  set(d, "investing", "invOut", { amount: "20000" });
  set(d, "investing", "invIn", { amount: "2000" });
  set(d, "financing", "finInvest", { amount: "10000" });
  set(d, "financing", "finDraw", { amount: "4000" });
  assert.equal(errors("CASH_FLOW", d).length, 0);
  const { figures } = buildStatement("CASH_FLOW", d);
  assert.equal(figures.netOperating, 3_500_000);
  assert.equal(figures.netInvesting, -1_800_000);
  assert.equal(figures.netFinancing, 600_000);
  assert.equal(figures.netChange, 2_300_000);
  assert.equal(figures.endingCash, 3_300_000);
});

// ── 4. Owner's equity ──────────────────────────────────────────────────────
test("owner's equity: profit adds, loss subtracts, never both", () => {
  const d = fresh("OWNERS_EQUITY");
  set(d, "beginning", "beginningCapital", { amount: "100000" });
  set(d, "additions", "investments", { amount: "20000" });
  set(d, "additions", "netProfit", { amount: "30000" });
  set(d, "reductions", "withdrawals", { amount: "10000" });
  set(d, "other", "otherChanges", { amount: "-500" });
  assert.equal(errors("OWNERS_EQUITY", d).length, 0);
  assert.equal(buildStatement("OWNERS_EQUITY", d).figures.ending, 13_950_000);

  const loss = fresh("OWNERS_EQUITY");
  set(loss, "beginning", "beginningCapital", { amount: "100000" });
  set(loss, "reductions", "netLoss", { amount: "25000" });
  assert.equal(buildStatement("OWNERS_EQUITY", loss).figures.ending, 7_500_000);

  set(d, "reductions", "netLoss", { amount: "1" });
  assert.ok(errors("OWNERS_EQUITY", d).some((e) => /either Net Profit or Net Loss/.test(e.message)));
});

// ── 5. Trial balance ───────────────────────────────────────────────────────
test("trial balance: totals, difference, add/edit/remove rows", () => {
  const d = fresh("TRIAL_BALANCE");
  set(d, "accounts", "cash", { debit: "50000" });
  set(d, "accounts", "equipment", { debit: "30000" });
  set(d, "accounts", "payable", { credit: "20000" });
  set(d, "accounts", "capital", { credit: "60000" });
  assert.equal(errors("TRIAL_BALANCE", d).length, 0);
  let r = buildStatement("TRIAL_BALANCE", d);
  assert.equal(r.figures.totalDebits, 8_000_000);
  assert.equal(r.figures.totalCredits, 8_000_000);
  assert.equal(r.document.checks[0].status, "pass");

  add(d, "accounts", { label: "Supplies", code: "150", debit: "100.25", credit: "" });
  r = buildStatement("TRIAL_BALANCE", d);
  assert.equal(r.figures.difference, 10_025);
  assert.equal(r.document.checks[0].status, "fail");
  d.sections.accounts = d.sections.accounts.filter((row) => row.values.label !== "Supplies");
  assert.equal(buildStatement("TRIAL_BALANCE", d).figures.difference, 0);
  assert.equal(buildStatement("TRIAL_BALANCE", d).document.checks.at(-1)!.status, "info");
});

test("trial balance: one side per account", () => {
  const d = fresh("TRIAL_BALANCE");
  set(d, "accounts", "cash", { debit: "10", credit: "10" });
  assert.ok(errors("TRIAL_BALANCE", d).some((e) => /either Debit or Credit/.test(e.message)));
  const e = fresh("TRIAL_BALANCE");
  add(e, "accounts", { label: "", code: "", debit: "", credit: "" });
  set(e, "accounts", "cash", { debit: "5" });
  // fully blank added row is ignored; a row with only a name is not
  assert.equal(errors("TRIAL_BALANCE", e).length, 0);
  add(e, "accounts", { label: "Prepaid", code: "7", debit: "", credit: "" });
  assert.ok(errors("TRIAL_BALANCE", e).length > 0);
});

// ── 6. COGS ────────────────────────────────────────────────────────────────
test("cost of goods sold: net purchases, goods available, COGS", () => {
  const d = fresh("COST_OF_GOODS_SOLD");
  set(d, "beginning", "beginningInventory", { amount: "20000" });
  set(d, "purchases", "purchases", { amount: "100000" });
  set(d, "purchaseReductions", "purchaseReturns", { amount: "3000" });
  set(d, "purchaseReductions", "purchaseDiscounts", { amount: "2000" });
  set(d, "freightIn", "freightIn", { amount: "1500" });
  set(d, "ending", "endingInventory", { amount: "25000" });
  assert.equal(errors("COST_OF_GOODS_SOLD", d).length, 0);
  const { figures, document } = buildStatement("COST_OF_GOODS_SOLD", d);
  assert.equal(figures.netPurchases, 9_650_000);
  assert.equal(figures.goodsAvailable, 11_650_000);
  assert.equal(figures.cogs, 9_150_000);
  assert.equal(document.options[0].label, "Inventory costing method");

  set(d, "ending", "endingInventory", { amount: "999999" });
  assert.ok(errors("COST_OF_GOODS_SOLD", d).some((e) => /cannot exceed goods available/.test(e.message)));
});

// ── 7. AR aging ────────────────────────────────────────────────────────────
function invoice(data: StatementData, over: Record<string, string>) {
  add(data, "invoices", { label: "Cust", invoiceNo: "I", invoiceDate: "2026-01-01", dueDate: "2026-02-01", original: "1000", paid: "", ...over });
}

test("AR aging: buckets are measured from the reporting date, not today", () => {
  const d = fresh("AR_AGING", { asOfDate: "2026-06-30" });
  d.sections.invoices = [];
  invoice(d, { label: "A", dueDate: "2026-07-15", original: "100" }); //  not yet due
  invoice(d, { label: "B", dueDate: "2026-06-30", original: "200" }); //  due on reporting date → current
  invoice(d, { label: "C", dueDate: "2026-06-20", original: "300" }); //  10 days
  invoice(d, { label: "D", dueDate: "2026-05-01", original: "400" }); //  60 days
  invoice(d, { label: "E", dueDate: "2026-04-01", original: "500" }); //  90 days
  invoice(d, { label: "F", dueDate: "2026-03-01", original: "600", paid: "100" }); // 121 days, 500 left
  invoice(d, { label: "G", dueDate: "2026-03-01", original: "700", paid: "700" }); // paid in full
  assert.equal(errors("AR_AGING", d).length, 0);
  const r = buildStatement("AR_AGING", d);
  assert.equal(r.figures.current, 30_000);
  assert.equal(r.figures.days1to30, 30_000);
  assert.equal(r.figures.days31to60, 40_000);
  assert.equal(r.figures.days61to90, 50_000);
  assert.equal(r.figures.over90, 50_000);
  assert.equal(r.figures.totalOutstanding, 200_000);
  assert.equal(r.figures.totalOverdue, 170_000);
  const byLabel = (label: string) => r.rowComputed[d.sections.invoices.find((x) => x.values.label === label)!.id];
  assert.equal(byLabel("D").daysPastDue, "60");
  assert.equal(byLabel("D").bucket, "31–60 Days");
  assert.equal(byLabel("G").bucket, "Paid");

  // Move the reporting date back: everything shifts accordingly.
  d.meta.asOfDate = "2026-03-15";
  const earlier = buildStatement("AR_AGING", d);
  assert.equal(earlier.figures.over90, 0);
  assert.equal(earlier.figures.current, 150_000); // A–E not yet due on 15 Mar
  assert.equal(earlier.figures.days1to30, 50_000); // F is 14 days past due
});

test("AR aging: validation of dates and amounts", () => {
  const d = fresh("AR_AGING", { asOfDate: "2026-06-30" });
  d.sections.invoices = [];
  invoice(d, { dueDate: "2025-12-01" }); // due before invoice
  assert.ok(errors("AR_AGING", d).some((e) => /before the invoice date/.test(e.message)));
  d.sections.invoices = [];
  invoice(d, { invoiceDate: "2026-07-01", dueDate: "2026-08-01" });
  assert.ok(errors("AR_AGING", d).some((e) => /after the reporting date/.test(e.message)));
  d.sections.invoices = [];
  invoice(d, { paid: "2000" });
  assert.ok(errors("AR_AGING", d).some((e) => /more than the invoice amount/.test(e.message)));
  d.sections.invoices = [];
  invoice(d, { dueDate: "2026-02-31" });
  assert.ok(errors("AR_AGING", d).some((e) => /not a valid date/.test(e.message)));
  d.sections.invoices = [];
  invoice(d, { original: "" });
  assert.ok(errors("AR_AGING", d).some((e) => /Original Amount.*required/.test(e.message)));
});

// ── 8. AP ──────────────────────────────────────────────────────────────────
test("AP report: outstanding, overdue days and payment status", () => {
  const d = fresh("AP_REPORT", { asOfDate: "2026-06-30" });
  d.sections.invoices = [];
  invoice(d, { label: "S1", dueDate: "2026-07-10", original: "1000" });
  invoice(d, { label: "S2", dueDate: "2026-07-10", original: "1000", paid: "400" });
  invoice(d, { label: "S3", dueDate: "2026-06-01", original: "1000", paid: "400" });
  invoice(d, { label: "S4", dueDate: "2026-06-01", original: "1000", paid: "1000" });
  const r = buildStatement("AP_REPORT", d);
  const s = (label: string) => r.rowComputed[d.sections.invoices.find((x) => x.values.label === label)!.id];
  assert.equal(s("S1").status, "Unpaid");
  assert.equal(s("S2").status, "Partially Paid");
  assert.equal(s("S3").status, "Overdue");
  assert.equal(s("S3").daysPastDue, "29");
  assert.equal(s("S3").outstanding, "600.00");
  assert.equal(s("S4").status, "Paid");
  assert.equal(r.figures.totalOutstanding, 220_000);
  assert.equal(r.figures.totalOverdue, 60_000);
});

// ── 9. Bank reconciliation ─────────────────────────────────────────────────
test("bank reconciliation: both adjusted balances, agree and disagree", () => {
  const d = fresh("BANK_RECONCILIATION");
  set(d, "bankBalance", "bankBalance", { amount: "10000" });
  set(d, "depositsInTransit", "dit", { amount: "1500" });
  set(d, "outstandingChecks", "osc", { amount: "2200" });
  set(d, "bookBalance", "bookBalance", { amount: "9150" });
  set(d, "bankFees", "fees", { amount: "50" });
  set(d, "bankCredits", "credits", { amount: "200" });
  assert.equal(errors("BANK_RECONCILIATION", d).length, 0);
  let r = buildStatement("BANK_RECONCILIATION", d);
  assert.equal(r.figures.adjustedBank, 930_000);
  assert.equal(r.figures.adjustedBook, 930_000);
  assert.equal(r.document.checks[0].status, "pass");

  set(d, "bookAdjustments", "bookAdj", { amount: "-30" }); // e.g. NSF cheque
  r = buildStatement("BANK_RECONCILIATION", d);
  assert.equal(r.figures.adjustedBook, 927_000);
  assert.equal(r.figures.difference, 3_000);
  assert.equal(r.document.checks[0].status, "fail");
  assert.equal(r.figures.adjustedBank, 930_000, "bank side not forced to match");
});

// ── 10. Budget vs actual ───────────────────────────────────────────────────
test("budget vs actual: variance sign and favorability by account type", () => {
  const d = fresh("BUDGET_VS_ACTUAL");
  set(d, "revenues", "sales", { budget: "100000", actual: "110000" }); // +10,000 favorable
  set(d, "revenues", "otherIncome", { budget: "5000", actual: "4000" }); // −1,000 unfavorable
  set(d, "expenses", "rent", { budget: "20000", actual: "22000" }); // +2,000 unfavorable
  set(d, "expenses", "salaries", { budget: "30000", actual: "28000" }); // −2,000 favorable
  assert.equal(errors("BUDGET_VS_ACTUAL", d).length, 0);
  const r = buildStatement("BUDGET_VS_ACTUAL", d);
  const row = (section: string, key: string) => r.rowComputed[d.sections[section].find((x) => x.key === key)!.id];
  assert.deepEqual(row("revenues", "sales"), { variance: "10,000.00", favorability: "Favorable" });
  assert.equal(row("revenues", "otherIncome").favorability, "Unfavorable");
  assert.equal(row("expenses", "rent").favorability, "Unfavorable");
  assert.equal(row("expenses", "salaries").favorability, "Favorable");
  assert.equal(row("expenses", "salaries").variance, "(2,000.00)");
  assert.equal(r.figures.revBudget, 10_500_000);
  assert.equal(r.figures.revActual, 11_400_000);
  assert.equal(r.figures.netBudget, 5_500_000);
  assert.equal(r.figures.netActual, 6_400_000);
  assert.equal(r.figures.netVariance, 900_000);
});

// ── meta validation ────────────────────────────────────────────────────────
test("business name and period are validated", () => {
  const d = fresh("INCOME_STATEMENT", { businessName: "  ", periodStart: "2026-12-31", periodEnd: "2026-01-01" });
  set(d, "revenue", "salesRevenue", { amount: "1" });
  const msgs = errors("INCOME_STATEMENT", d).map((e) => e.message);
  assert.ok(msgs.some((m) => /business name/.test(m)));
  assert.ok(msgs.some((m) => /on or after the start date/.test(m)));
  const b = fresh("BALANCE_SHEET", { asOfDate: "" });
  set(b, "assets", "cash", { amount: "1" });
  assert.ok(errors("BALANCE_SHEET", b).some((m) => /statement \/ reporting date/.test(m.message)));
});

test("invalid numbers produce clear messages", () => {
  const d = fresh("INCOME_STATEMENT");
  set(d, "revenue", "salesRevenue", { amount: "12abc" });
  set(d, "opex", "rent", { amount: "1.234" });
  const msgs = errors("INCOME_STATEMENT", d).map((e) => e.message);
  assert.ok(msgs.some((m) => /valid number/.test(m)));
  assert.ok(msgs.some((m) => /2 decimal places/.test(m)));
});

// ── normalization (server trust boundary) ─────────────────────────────────
test("normalizeData drops unknown sections, columns and keys and caps sizes", () => {
  const hostile = {
    meta: { businessName: "x".repeat(500), notes: "n".repeat(9999), options: { inventoryMethod: "evil" }, extra: 1 },
    sections: {
      revenue: [
        { id: "../../etc", key: "notARealKey", values: { label: "Sales", amount: "5", evil: "<script>", computedThing: "z" } },
        { id: "../../etc", values: { label: "dup id", amount: "1" } },
        null,
        "string",
      ],
      bogusSection: [{ id: "a", values: {} }],
    },
  };
  const n = normalizeData("INCOME_STATEMENT", hostile);
  assert.equal(n.meta.businessName.length, 120);
  assert.equal(n.meta.notes.length, 2000);
  assert.equal(n.sections.bogusSection, undefined);
  assert.equal(n.sections.revenue.length, 2);
  assert.equal(n.sections.revenue[0].key, undefined);
  assert.deepEqual(Object.keys(n.sections.revenue[0].values).sort(), ["amount", "label"]);
  assert.notEqual(n.sections.revenue[0].id, n.sections.revenue[1].id);
  assert.ok(/^[A-Za-z0-9_-]+$/.test(n.sections.revenue[0].id));
  // missing sections fall back to template defaults
  assert.equal(n.sections.opex.length, 5);
  const cogs = normalizeData("COST_OF_GOODS_SOLD", { meta: { options: { inventoryMethod: "Perpetual" } } });
  assert.equal(cogs.meta.options.inventoryMethod, "Perpetual");
  assert.equal(normalizeData("COST_OF_GOODS_SOLD", {}).meta.options.inventoryMethod, "Not specified");
  assert.deepEqual(normalizeData("INCOME_STATEMENT", null).sections.revenue.map((r) => r.key), ["salesRevenue"]);
});

// ── PDF ────────────────────────────────────────────────────────────────────
test("PDF contains the actual generated report for every template", () => {
  for (const type of STATEMENT_TYPES) {
    const d = fresh(type);
    d.meta.notes = "Prepared (draft) \\ note with parens";
    // Fill something plausible for every template so tables/lines have content.
    for (const [sectionId, rows] of Object.entries(d.sections)) {
      rows.forEach((row, i) => {
        const section = getTemplate(type).sections.find((s) => s.id === sectionId)!;
        for (const col of section.columns) {
          if (col.computed) continue;
          if (col.kind === "money") row.values[col.id] = String(100 + i);
          if (col.kind === "date") row.values[col.id] = col.id === "dueDate" ? "2026-05-01" : "2026-01-15";
          if (col.id === "invoiceNo") row.values[col.id] = `INV-${i}`;
          if (col.id === "label" && !row.values.label) row.values.label = `Item ${i}`;
        }
      });
    }
    const { document } = buildStatement(type, d);
    const pdf = renderStatementPdf(document, { generatedAt: new Date("2026-10-22T00:00:00Z"), preparedBy: "Juan Dela Cruz" });
    const head = pdf.subarray(0, 8).toString("latin1");
    assert.ok(head.startsWith("%PDF-1.4"), `${type} header`);
    assert.ok(pdf.subarray(-6).toString("latin1").includes("%%EOF"));
    const body = pdf.toString("latin1");
    assert.ok(body.includes("(Sampaguita Trading)"), `${type} business name`);
    assert.ok(body.includes(getTemplate(type).name.replace(/[()\\]/g, "\\$&")), `${type} title`);
    assert.ok(body.includes("Validation Results"), `${type} checks`);
    assert.ok(body.includes("Page 1 of"), `${type} footer`);
    assert.ok(pdf.length > 1500, `${type} not a blank document`);
    // xref offsets point at "N 0 obj"
    const xrefAt = Number(/startxref\n(\d+)/.exec(body)![1]);
    assert.ok(body.slice(xrefAt).startsWith("xref"));
    const offsets = [...body.slice(xrefAt).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    offsets.forEach((off, i) => assert.ok(body.slice(off).startsWith(`${i + 1} 0 obj`), `${type} xref ${i + 1}`));
  }
});
