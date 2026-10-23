import type { FinancialStatement, Prisma } from "@prisma/client";
import { buildStatement } from "./build";
import { normalizeData } from "./data";
import { formatDay, parseDateDay } from "./format";
import { getTemplate } from "./templates";
import {
  isStatementType,
  type StatementData,
  type StatementDetailDto,
  type StatementStatus,
  type StatementSummaryDto,
  type StatementType,
  type StoredResults,
} from "./types";

/** Server-side mappers between Prisma rows and DTOs. */

const dayToDate = (raw: string): Date | null =>
  parseDateDay(raw) === null ? null : new Date(`${raw.trim()}T00:00:00.000Z`);

/** Indexed/list columns derived from the editable data. */
export function persistedColumns(type: StatementType, data: StatementData) {
  const def = getTemplate(type);
  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  if (def.periodMode === "period") {
    periodStart = dayToDate(data.meta.periodStart);
    periodEnd = dayToDate(data.meta.periodEnd);
    // Never violate the DB CHECK (start <= end); validation reports the mistake to the student.
    if (periodStart && periodEnd && periodStart > periodEnd) {
      periodStart = null;
      periodEnd = null;
    }
  } else {
    periodEnd = dayToDate(data.meta.asOfDate);
  }
  return { businessName: data.meta.businessName.trim().slice(0, 120), periodStart, periodEnd };
}

export function computeResults(type: StatementType, data: StatementData): StoredResults {
  const { document } = buildStatement(type, data);
  return { summary: document.summary, checks: document.checks, computedAt: new Date().toISOString() };
}

export function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function periodLabel(type: StatementType, row: Pick<FinancialStatement, "periodStart" | "periodEnd">): string {
  const day = (d: Date | null) => (d ? formatDay(Math.round(d.getTime() / 86_400_000)) : "");
  if (getTemplate(type).periodMode === "asOf") {
    const end = day(row.periodEnd);
    return end ? `As of ${end}` : "";
  }
  const start = day(row.periodStart);
  const end = day(row.periodEnd);
  return start && end ? `${start} – ${end}` : "";
}

function statementTypeOf(row: FinancialStatement): StatementType {
  if (!isStatementType(row.statementType)) throw new Error(`Corrupt statement type on ${row.id}`);
  return row.statementType;
}

export function toSummary(row: FinancialStatement): StatementSummaryDto {
  const type = statementTypeOf(row);
  const template = getTemplate(type);
  const results = row.results as StoredResults | null;
  return {
    id: row.id,
    statementType: type,
    templateName: template.name,
    category: template.category,
    status: row.status === "GENERATED" ? ("GENERATED" satisfies StatementStatus) : "DRAFT",
    businessName: row.businessName,
    periodLabel: periodLabel(type, row),
    headline: results?.summary?.[0] ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    generatedAt: row.generatedAt ? row.generatedAt.toISOString() : null,
  };
}

export function toDetail(row: FinancialStatement): StatementDetailDto {
  const type = statementTypeOf(row);
  return { ...toSummary(row), data: normalizeData(type, row.data) };
}

export function slug(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "statement"
  );
}

export const STATEMENT_ID = /^[A-Za-z0-9_-]{8,64}$/;
export const MAX_STATEMENTS_PER_STUDENT = 200;
