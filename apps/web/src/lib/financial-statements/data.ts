import { createDefaultData, getTemplate, newRowId } from "./templates";
import type {
  SectionDef,
  StatementData,
  StatementRow,
  StatementType,
} from "./types";

export const LIMITS = {
  businessName: 120,
  notes: 2000,
  cell: 160,
  rowsPerSection: 150,
  rowId: 40,
  name: 120,
  title: 120,
} as const;

/**
 * A row is "in use" once the student has typed something other than the
 * template's own default text. Untouched template rows are ignored so a
 * student is never forced to delete rows they don't need.
 */
export function isRowInUse(section: SectionDef, row: StatementRow): boolean {
  const seed = row.key ? section.seeds.find((s) => s.key === row.key) : undefined;
  for (const column of section.columns) {
    if (column.computed || column.kind === "select") continue;
    const value = (row.values[column.id] ?? "").trim();
    if (value === "") continue;
    const seeded = (seed?.values[column.id] ?? "").trim();
    if (value !== seeded) return true;
  }
  return false;
}

export function seedFor(section: SectionDef, row: StatementRow) {
  return row.key ? section.seeds.find((s) => s.key === row.key) : undefined;
}

function cleanString(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function cleanDate(value: unknown): string {
  const text = cleanString(value, 10).trim();
  return text;
}

/**
 * Coerces untrusted input into a structurally valid StatementData for the
 * given template: unknown sections/columns/keys are dropped, sizes capped.
 * This is not accounting validation — see validate.ts.
 */
export function normalizeData(type: StatementType, input: unknown): StatementData {
  const template = getTemplate(type);
  const defaults = createDefaultData(type);
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const rawMeta = (raw.meta && typeof raw.meta === "object" ? raw.meta : {}) as Record<string, unknown>;
  const rawOptions = (rawMeta.options && typeof rawMeta.options === "object" ? rawMeta.options : {}) as Record<string, unknown>;
  const rawSections = (raw.sections && typeof raw.sections === "object" ? raw.sections : {}) as Record<string, unknown>;

  const options: Record<string, string> = { ...defaults.meta.options };
  for (const option of template.options ?? []) {
    const chosen = rawOptions[option.id];
    if (typeof chosen === "string" && option.choices.includes(chosen)) options[option.id] = chosen;
  }

  const sections: Record<string, StatementRow[]> = {};
  const usedIds = new Set<string>();
  for (const section of template.sections) {
    const incoming = rawSections[section.id];
    if (!Array.isArray(incoming)) {
      sections[section.id] = defaults.sections[section.id];
      continue;
    }
    const keys = new Set(section.seeds.map((s) => s.key).filter((k): k is string => Boolean(k)));
    const columnIds = section.columns.filter((c) => !c.computed);
    const rows: StatementRow[] = [];
    for (const item of incoming.slice(0, LIMITS.rowsPerSection)) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      let id = cleanString(r.id, LIMITS.rowId).replace(/[^A-Za-z0-9_-]/g, "");
      if (!id || usedIds.has(id)) id = newRowId();
      usedIds.add(id);
      const key = typeof r.key === "string" && keys.has(r.key) ? r.key : undefined;
      const rawValues = (r.values && typeof r.values === "object" ? r.values : {}) as Record<string, unknown>;
      const values: Record<string, string> = {};
      for (const column of columnIds) {
        let v = cleanString(rawValues[column.id], LIMITS.cell);
        if (column.kind === "select") {
          v = column.options?.includes(v) ? v : "";
        } else if (column.kind === "date") {
          v = cleanDate(v);
        }
        values[column.id] = v;
      }
      rows.push({ id, ...(key ? { key } : {}), values });
    }
    sections[section.id] = rows;
  }

  return {
    meta: {
      businessName: cleanString(rawMeta.businessName, LIMITS.businessName),
      periodStart: cleanDate(rawMeta.periodStart),
      periodEnd: cleanDate(rawMeta.periodEnd),
      asOfDate: cleanDate(rawMeta.asOfDate),
      notes: cleanString(rawMeta.notes, LIMITS.notes),
      preparedByName:
        typeof rawMeta.preparedByName === "string"
          ? cleanString(rawMeta.preparedByName, LIMITS.name)
          : (defaults.meta.preparedByName ?? ""),
      preparedByTitle:
        typeof rawMeta.preparedByTitle === "string"
          ? cleanString(rawMeta.preparedByTitle, LIMITS.title)
          : (defaults.meta.preparedByTitle ?? "Student / Accounting Preparer"),
      approvedByName:
        typeof rawMeta.approvedByName === "string"
          ? cleanString(rawMeta.approvedByName, LIMITS.name)
          : (defaults.meta.approvedByName ?? ""),
      approvedByTitle:
        typeof rawMeta.approvedByTitle === "string"
          ? cleanString(rawMeta.approvedByTitle, LIMITS.title)
          : (defaults.meta.approvedByTitle ?? "Faculty Instructor / Supervisor"),
      options,
    },
    sections,
  };
}
