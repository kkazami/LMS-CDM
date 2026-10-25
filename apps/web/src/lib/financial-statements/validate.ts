import { buildStatement } from "./build";
import { isRowInUse } from "./data";
import { formatCents, parseDateDay, parseMoney } from "./format";
import { getTemplate } from "./templates";
import type {
  SectionDef,
  StatementData,
  StatementRow,
  StatementType,
  ValidationIssue,
} from "./types";

const err = (message: string, field?: ValidationIssue["field"]): ValidationIssue => ({ severity: "error", message, field });
const warn = (message: string, field?: ValidationIssue["field"]): ValidationIssue => ({ severity: "warning", message, field });

const moneyProblem = (reason: "format" | "decimals" | "range"): string =>
  reason === "decimals"
    ? "Use at most 2 decimal places."
    : reason === "range"
      ? "That amount is too large."
      : "Enter a valid number, e.g. 1250.00.";

function rowLabel(section: SectionDef, row: StatementRow, index: number): string {
  const name = (row.values.label ?? "").trim();
  return `${section.title} › ${name || `Row ${index + 1}`}`;
}

/**
 * Accounting-input validation. "error" issues block Generate; "warning"
 * issues are shown but the statement can still be generated (the report
 * itself records the discrepancy).
 */
export function validateStatement(type: StatementType, data: StatementData): ValidationIssue[] {
  const def = getTemplate(type);
  const issues: ValidationIssue[] = [];

  // ── Details ──
  if (!data.meta.businessName.trim()) {
    issues.push(err("Enter the business name.", { meta: "businessName" }));
  }
  if (def.periodMode === "period") {
    const start = parseDateDay(data.meta.periodStart);
    const end = parseDateDay(data.meta.periodEnd);
    if (!data.meta.periodStart.trim()) issues.push(err("Enter the reporting period start date.", { meta: "periodStart" }));
    else if (start === null) issues.push(err("The start date is not a valid date.", { meta: "periodStart" }));
    if (!data.meta.periodEnd.trim()) issues.push(err("Enter the reporting period end date.", { meta: "periodEnd" }));
    else if (end === null) issues.push(err("The end date is not a valid date.", { meta: "periodEnd" }));
    if (start !== null && end !== null && start > end) {
      issues.push(err("The end date must be on or after the start date.", { meta: "periodEnd" }));
    }
  } else {
    if (!data.meta.asOfDate.trim()) issues.push(err("Enter the statement / reporting date.", { meta: "asOfDate" }));
    else if (parseDateDay(data.meta.asOfDate) === null) issues.push(err("The statement date is not a valid date.", { meta: "asOfDate" }));
  }

  // ── Rows ──
  let usedRowCount = 0;
  for (const section of def.sections) {
    const rows = data.sections[section.id] ?? [];
    const amountColumnId = section.columns.find((c) => c.kind === "money" && !c.computed)?.id;

    // Mandatory template rows.
    for (const seed of section.seeds) {
      if (!seed.required || !seed.key) continue;
      const row = rows.find((r) => r.key === seed.key);
      const seedLabel = seed.values.label ?? seed.key;
      if (!row) {
        issues.push(err(`${section.title}: the required "${seedLabel}" row was removed. Add a row for it or reset the section.`, { sectionId: section.id }));
        continue;
      }
      const raw = amountColumnId ? (row.values[amountColumnId] ?? "").trim() : "";
      if (raw === "") {
        issues.push(
          err(`${seedLabel} is required — enter an amount (use 0 if there is none).`, {
            sectionId: section.id,
            rowId: row.id,
            columnId: amountColumnId,
          }),
        );
      }
    }

    rows.forEach((row, index) => {
      if (!isRowInUse(section, row)) return;
      usedRowCount += 1;
      const where = rowLabel(section, row, index);
      for (const column of section.columns) {
        if (column.computed) continue;
        const raw = (row.values[column.id] ?? "").trim();
        const field = { sectionId: section.id, rowId: row.id, columnId: column.id };

        if (raw === "") {
          if (column.required) issues.push(err(`${where}: ${column.label} is required.`, field));
          continue;
        }
        if (column.kind === "money") {
          const parsed = parseMoney(raw);
          if (parsed.status === "invalid") {
            issues.push(err(`${where}: ${column.label} — ${moneyProblem(parsed.reason)}`, field));
          } else if (parsed.status === "ok" && parsed.cents < 0 && !column.allowNegative) {
            issues.push(err(`${where}: ${column.label} cannot be negative here.`, field));
          }
        } else if (column.kind === "date") {
          if (parseDateDay(raw) === null) {
            issues.push(err(`${where}: ${column.label} is not a valid date.`, field));
          }
        } else if (column.kind === "select") {
          if (!column.options?.includes(raw)) issues.push(err(`${where}: choose a valid ${column.label}.`, field));
        }
      }
    });
  }

  if (usedRowCount === 0) {
    issues.push(err("Enter at least one amount before generating the statement."));
  }

  // Figure-based rules (skip if row-level errors already make figures unreliable).
  const known = issues.some((i) => i.severity === "error" && i.field?.rowId);
  if (!known) {
    const { figures, document } = buildStatement(type, data);
    switch (type) {
      case "OWNERS_EQUITY":
        if (figures.netProfit > 0 && figures.netLoss > 0) {
          issues.push(
            err(
              "Enter either Net Profit or Net Loss, not both (a business cannot have both profit and loss in the same period). Please clear or delete whichever one does not apply.",
              { sectionId: "reductions" }
            )
          );
        }
        if (figures.ending < 0) issues.push(warn(`Ending owner's equity is negative (${formatCents(figures.ending)}). Check withdrawals and losses.`));
        break;
      case "INCOME_STATEMENT":
        if (figures.returns > figures.salesRevenue) {
          issues.push(warn("Sales returns are larger than sales revenue, so Net Sales is negative."));
        }
        break;
      case "CASH_FLOW":
        if (figures.endingCash < 0) issues.push(warn(`Ending cash is negative (${formatCents(figures.endingCash)}). Review your entries.`));
        break;
      case "BALANCE_SHEET":
        for (const check of document.checks) {
          if (check.status === "fail") issues.push(warn(`${check.label}. ${check.detail}`));
        }
        break;
      default:
        break;
    }
  }

  return issues;
}

export function hasBlockingErrors(issues: ValidationIssue[]): boolean {
  return issues.some((i) => i.severity === "error");
}
