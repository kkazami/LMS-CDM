export const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-current dark:border-white/20 dark:bg-[#1C2030] dark:text-slate-100";
export const secondaryClass =
  "min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5";
export async function rosterRequest<T>(
  url: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  let response: Response;
  try { response = await fetch(url, {
    method: body === undefined ? "GET" : method,
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
    cache: "no-store",
    ...(body === undefined ? { signal: AbortSignal.timeout(20000) } : {}),
  }); } catch (error) {
    throw new Error(error instanceof Error && error.name === "TimeoutError"
      ? "This is taking longer than expected. Refresh and try again."
      : "Could not connect. Check your connection and try again.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.message ?? data?.error?.message ?? "Could not load this information. Refresh and try again.",
    );
  if (!data) throw new Error("Could not read the response. Refresh and try again.");
  return data;
}
export type TermOption = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  isCurrent: boolean;
};
export type BatchView = {
  id: string;
  type: string;
  status: string;
  policy: string;
  expiresAt: string;
  rows: Array<{
    id: string;
    rowNumber: number;
    values: Record<string, string>;
    previousValues?: Record<string, string> | null;
    issues: string[];
    proposedAction: string;
    selected: boolean;
    outcome: string | null;
    error: string | null;
  }>;
};
