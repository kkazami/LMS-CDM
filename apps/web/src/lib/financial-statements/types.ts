/**
 * Financial Statement Generator — shared types.
 * Pure TypeScript (no Next/React/Prisma imports) so the engine is unit-testable.
 */

export const STATEMENT_TYPES = [
  "INCOME_STATEMENT",
  "BALANCE_SHEET",
  "CASH_FLOW",
  "OWNERS_EQUITY",
  "TRIAL_BALANCE",
  "COST_OF_GOODS_SOLD",
  "AR_AGING",
  "AP_REPORT",
  "BANK_RECONCILIATION",
  "BUDGET_VS_ACTUAL",
] as const;

export type StatementType = (typeof STATEMENT_TYPES)[number];

export type StatementStatus = "DRAFT" | "GENERATED";

export function isStatementType(value: unknown): value is StatementType {
  return typeof value === "string" && (STATEMENT_TYPES as readonly string[]).includes(value);
}

// ─── Template definitions (code-owned, immutable at runtime) ────────────────

export type ColumnKind = "text" | "money" | "date" | "select";

export interface ColumnDef {
  id: string;
  label: string;
  kind: ColumnKind;
  /** Required whenever the row is "in use". */
  required?: boolean;
  /** Money columns reject negatives unless this is set. */
  allowNegative?: boolean;
  options?: readonly string[];
  placeholder?: string;
  /** Derived by the engine; rendered read-only and never persisted. */
  computed?: boolean;
}

export interface RowSeed {
  key?: string;
  values: Record<string, string>;
  /** Mandatory row: its amount must be entered (0 is a valid explicit entry). */
  required?: boolean;
}

export interface SectionDef {
  id: string;
  title: string;
  hint?: string;
  columns: ColumnDef[];
  seeds: RowSeed[];
  addLabel: string;
}

export interface TemplateOption {
  id: string;
  label: string;
  choices: readonly string[];
  default: string;
  hint?: string;
}

export type TemplateCategory =
  | "Core Statements"
  | "Accounting Records"
  | "Receivables & Payables"
  | "Cash & Planning";

export interface TemplateDef {
  type: StatementType;
  name: string;
  category: TemplateCategory;
  description: string;
  purpose: string;
  /** "period": start & end dates. "asOf": a single statement date. */
  periodMode: "period" | "asOf";
  formulas: string[];
  options?: TemplateOption[];
  sections: SectionDef[];
}

// ─── Student-owned data ─────────────────────────────────────────────────────

export interface StatementRow {
  id: string;
  /** Present for rows seeded from the template; used for rules and "reset". */
  key?: string;
  values: Record<string, string>;
}

export interface StatementMeta {
  businessName: string;
  periodStart: string;
  periodEnd: string;
  asOfDate: string;
  notes: string;
  options: Record<string, string>;
}

export interface StatementData {
  meta: StatementMeta;
  sections: Record<string, StatementRow[]>;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export type MetaField = "businessName" | "periodStart" | "periodEnd" | "asOfDate";

export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  field?: {
    meta?: MetaField;
    sectionId?: string;
    rowId?: string;
    columnId?: string;
  };
}

// ─── Report document (shared by on-screen preview and PDF) ──────────────────

export interface ReportLine {
  kind: "heading" | "item" | "subtotal" | "total" | "grand" | "text";
  label: string;
  cents?: number;
  indent?: 0 | 1 | 2;
}

export interface ReportLinesBlock {
  type: "lines";
  title?: string;
  lines: ReportLine[];
}

export interface ReportTableBlock {
  type: "table";
  title?: string;
  columns: { label: string; align: "left" | "right" | "center" }[];
  rows: string[][];
  footer?: string[][];
}

export type ReportBlock = ReportLinesBlock | ReportTableBlock;

export interface ReportCheck {
  id: string;
  status: "pass" | "fail" | "info";
  label: string;
  detail: string;
}

export interface SummaryMetric {
  label: string;
  cents: number;
}

export interface ReportDocument {
  type: StatementType;
  title: string;
  businessName: string;
  periodText: string;
  currency: "PHP";
  blocks: ReportBlock[];
  checks: ReportCheck[];
  summary: SummaryMetric[];
  notes: string;
  /** Free-text method label shown beneath the heading (e.g. inventory method). */
  options: { label: string; value: string }[];
}

export interface BuildResult {
  document: ReportDocument;
  /** Derived per-row cells (outstanding balance, days past due, variance, …). */
  rowComputed: Record<string, Record<string, string>>;
  /** Σ of each section's primary amount column, in cents. */
  sectionTotals: Record<string, number>;
  /** Named intermediate/final figures in cents (e.g. netSales, endingCash). */
  figures: Record<string, number>;
}

/** Persisted in FinancialStatement.results. */
export interface StoredResults {
  summary: SummaryMetric[];
  checks: ReportCheck[];
  computedAt: string;
}

// ─── API DTOs (shared by routes and client components) ──────────────────────

export interface StatementSummaryDto {
  id: string;
  statementType: StatementType;
  templateName: string;
  category: TemplateCategory;
  status: StatementStatus;
  businessName: string;
  /** Human-readable reporting period / statement date, or "" if not set. */
  periodLabel: string;
  headline: SummaryMetric | null;
  createdAt: string;
  updatedAt: string;
  generatedAt: string | null;
}

export interface StatementDetailDto extends StatementSummaryDto {
  data: StatementData;
}
