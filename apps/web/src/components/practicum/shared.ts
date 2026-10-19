import { SUBMISSION_STATUS_LABELS, type SubmissionStatus } from "@/lib/practicum/rules";

const TIME_ZONE = "Asia/Manila";

/** Fixed time zone so server-rendered and client-rendered dates always match. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** `<input type="date">` value (YYYY-MM-DD) for the Manila calendar day of an instant. */
export function toDateInputValue(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(iso));
}

export const STATUS_CLASSES: Record<SubmissionStatus, string> = {
  SUBMITTED: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25",
  NEEDS_REVISION: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25",
  APPROVED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25",
};

export function statusLabel(status: SubmissionStatus): string {
  return SUBMISSION_STATUS_LABELS[status];
}

/** Minimal JSON fetch helper for the Practicum API. Throws Error(message) on non-2xx. */
export async function practicumFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string } & T;
  if (!response.ok) {
    throw new Error(payload.message ?? "Something went wrong. Please try again.");
  }
  return payload;
}
