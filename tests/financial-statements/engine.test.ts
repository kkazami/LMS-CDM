import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStatement } from "../../apps/web/src/lib/financial-statements/build";
import { normalizeData } from "../../apps/web/src/lib/financial-statements/data";
import { centsOrZero, formatCents, parseDateDay, parseMoney, sanitizeMoneyInput } from "../../apps/web/src/lib/financial-statements/format";
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
test("all 4 templates exist, build, and start with blank (never invented) amounts", () => {
  assert.equal(TEMPLATES.length, 4);
  assert.equal(new Set(TEMPLATES.map((t) => t.type)).size, 4);
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
    assert.ok(!body.includes("Validation Results"), `${type} validation checks omitted from official PDF`);
    assert.ok(body.includes("Page 1 of"), `${type} footer`);
    assert.ok(pdf.length > 1500, `${type} not a blank document`);
    // xref offsets point at "N 0 obj"
    const xrefAt = Number(/startxref\n(\d+)/.exec(body)![1]);
    assert.ok(body.slice(xrefAt).startsWith("xref"));
    const offsets = [...body.slice(xrefAt).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    offsets.forEach((off, i) => assert.ok(body.slice(off).startsWith(`${i + 1} 0 obj`), `${type} xref ${i + 1}`));
  }
});

test("Custom editable preparer and approver signatures propagate to build and PDF", () => {
  const d = fresh("INCOME_STATEMENT");
  d.meta.preparedByName = "Maria Clara Santos";
  d.meta.preparedByTitle = "Senior Accounting Proponent";
  d.meta.approvedByName = "Prof. Crisostomo Ibarra, CPA";
  d.meta.approvedByTitle = "Dean of Business Administration";

  const normalized = normalizeData("INCOME_STATEMENT", d);
  assert.equal(normalized.meta.preparedByName, "Maria Clara Santos");
  assert.equal(normalized.meta.preparedByTitle, "Senior Accounting Proponent");
  assert.equal(normalized.meta.approvedByName, "Prof. Crisostomo Ibarra, CPA");
  assert.equal(normalized.meta.approvedByTitle, "Dean of Business Administration");

  const { document } = buildStatement("INCOME_STATEMENT", normalized);
  assert.equal(document.preparedBy, "Maria Clara Santos");
  assert.equal(document.preparedByTitle, "Senior Accounting Proponent");
  assert.equal(document.approvedBy, "Prof. Crisostomo Ibarra, CPA");
  assert.equal(document.approvedByTitle, "Dean of Business Administration");

  const pdf = renderStatementPdf(document, { generatedAt: new Date("2026-10-22T00:00:00Z") });
  const body = pdf.toString("latin1");
  assert.ok(body.includes("(Maria Clara Santos)"));
  assert.ok(body.includes("(Senior Accounting Proponent)"));
  assert.ok(body.includes("(Prof. Crisostomo Ibarra, CPA)"));
  assert.ok(body.includes("(Dean of Business Administration)"));
});

test("sanitizeMoneyInput restricts letters, words, and special symbols", () => {
  // Words and letters are completely stripped
  assert.equal(sanitizeMoneyInput("awdawdaw"), "");
  assert.equal(sanitizeMoneyInput("Cash1250"), "1250");
  assert.equal(sanitizeMoneyInput("abc123def456"), "123456");

  // Special symbols are restricted
  assert.equal(sanitizeMoneyInput("$1,250.50"), "1250.50");
  assert.equal(sanitizeMoneyInput("₱9,999.00"), "9999.00");
  assert.equal(sanitizeMoneyInput("@#$%^&*!"), "");

  // Decimals are capped at 2 places and single dot
  assert.equal(sanitizeMoneyInput("12.345"), "12.34");
  assert.equal(sanitizeMoneyInput("10..20.30"), "10.20");

  // Negative restrictions
  assert.equal(sanitizeMoneyInput("-500", false), "500");
  assert.equal(sanitizeMoneyInput("-500", true), "-500");
  assert.equal(sanitizeMoneyInput("-", true), "-");
});


