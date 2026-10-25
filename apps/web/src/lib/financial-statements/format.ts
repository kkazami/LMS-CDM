/**
 * Exact money + date helpers. Money is parsed from text straight into integer
 * cents (no floating-point multiplication) and all totals are cent integers.
 */

const MAX_WHOLE_DIGITS = 12;

export type ParsedMoney =
  | { status: "empty" }
  | { status: "ok"; cents: number }
  | { status: "invalid"; reason: "format" | "decimals" | "range" };

export function parseMoney(raw: string | undefined | null): ParsedMoney {
  let text = (raw ?? "").trim().replace(/,/g, "").replace(/\s+/g, "");
  if (text.startsWith("(") && text.endsWith(")")) {
    text = "-" + text.slice(1, -1).trim();
  }
  if (text.startsWith("-₱") || text.startsWith("-P") || text.startsWith("-p")) {
    text = "-" + text.slice(2).trim();
  } else if (/^-[Pp][Hh][Pp]/.test(text)) {
    text = "-" + text.slice(4).trim();
  } else if (text.startsWith("₱") || text.startsWith("P") || text.startsWith("p")) {
    if (/^[₱Pp][\d.]/.test(text)) text = text.slice(1).trim();
  } else if (/^[Pp][Hh][Pp][\d.]/.test(text)) {
    text = text.slice(3).trim();
  }
  if (text === "") return { status: "empty" };
  const match = /^(-)?(\d*)(?:\.(\d*))?$/.exec(text);
  if (!match) return { status: "invalid", reason: "format" };
  const [, sign, whole = "", frac = ""] = match;
  if (whole === "" && frac === "") return { status: "invalid", reason: "format" };
  if (frac.length > 2) return { status: "invalid", reason: "decimals" };
  const wholeTrimmed = whole.replace(/^0+(?=\d)/, "");
  if (wholeTrimmed.length > MAX_WHOLE_DIGITS) return { status: "invalid", reason: "range" };
  const cents = Number(wholeTrimmed || "0") * 100 + Number((frac + "00").slice(0, 2));
  return { status: "ok", cents: sign && cents !== 0 ? -cents : cents };
}

/**
 * Strips words, letters, and special symbols from money inputs.
 * Allows only digits (0-9), at most one decimal point (up to 2 decimals),
 * and optional leading minus sign if allowNegative is true.
 */
export function sanitizeMoneyInput(raw: string | undefined | null, allowNegative = false): string {
  if (!raw) return "";
  const str = String(raw).trim();
  const isNegative = allowNegative && (str.startsWith("-") || str.startsWith("("));

  // Remove any character that is not a digit or decimal point
  let stripped = str.replace(/[^0-9.]/g, "");

  // Allow at most one decimal point and at most 2 decimal places
  const dotIndex = stripped.indexOf(".");
  if (dotIndex !== -1) {
    const whole = stripped.slice(0, dotIndex);
    const decimal = stripped.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    stripped = `${whole}.${decimal}`;
  }

  if (stripped === "") {
    return isNegative ? "-" : "";
  }
  return isNegative ? `-${stripped}` : stripped;
}

/** Cents of a cell, treating blank/invalid as 0 (validation reports the invalid ones). */
export function centsOrZero(raw: string | undefined | null): number {
  const parsed = parseMoney(raw);
  return parsed.status === "ok" ? parsed.cents : 0;
}

/** 1234567 → "12,345.67"; negatives → "(12,345.67)". */
export function formatCents(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const whole = Math.trunc(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % 100).toString().padStart(2, "0");
  const text = `${whole}.${frac}`;
  return cents < 0 && abs !== 0 ? `(${text})` : text;
}

/** 1234567 → "₱12,345.67"; negatives → "(₱12,345.67)". */
export function formatPeso(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const whole = Math.trunc(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % 100).toString().padStart(2, "0");
  const text = `₱${whole}.${frac}`;
  return cents < 0 && abs !== 0 ? `(${text})` : text;
}

/** Plain signed form for inputs/messages: -1,234.50 */
export function formatCentsSigned(cents: number): string {
  const text = formatCents(Math.abs(cents));
  return cents < 0 ? `-${text}` : text;
}

/** Maps any check status string to the canonical CheckStatus union. */
export function normalizeCheckStatus(status: string | undefined): "PASS" | "WARNING" | "FAIL" | "NOT_CHECKED" | "REVIEW_REQUIRED" {
  if (!status) return "NOT_CHECKED";
  const upper = status.toUpperCase();
  if (upper === "PASS") return "PASS";
  if (upper === "FAIL") return "FAIL";
  if (upper === "WARNING" || upper === "WARN") return "WARNING";
  if (upper === "NOT_CHECKED" || upper === "UNCHECKED") return "NOT_CHECKED";
  if (upper === "REVIEW_REQUIRED" || upper === "REVIEW" || upper === "INFO") return "REVIEW_REQUIRED";
  return "REVIEW_REQUIRED";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MS_PER_DAY = 86_400_000;

/** "YYYY-MM-DD" → whole days since epoch, or null if not a real calendar date. */
export function parseDateDay(raw: string | undefined | null): number | null {
  const text = (raw ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1900 || year > 2200) return null;
  const ms = Date.UTC(year, month - 1, day);
  const d = new Date(ms);
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return Math.round(ms / MS_PER_DAY);
}

export function formatDay(day: number): string {
  const d = new Date(day * MS_PER_DAY);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatDateText(raw: string | undefined | null): string {
  const day = parseDateDay(raw);
  return day === null ? "" : formatDay(day);
}
