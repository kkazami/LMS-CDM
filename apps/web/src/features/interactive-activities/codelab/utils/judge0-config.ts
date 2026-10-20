/** Shared, sandboxed execution for every CodeLab language. */
export const DEFAULT_PUBLIC_JUDGE0_URL = "https://ce.judge0.com";
const RAPID_API_HOST = "judge0-ce.p.rapidapi.com";
const EXECUTION_TIMEOUT_MS = 30_000;
// Bound work across requests within a warm web process. Multi-instance quotas belong at the worker service.
let pendingExecutions = 0;
const MAX_PENDING_EXECUTIONS = 4;

export function getJudge0BaseUrl(): string {
  return (process.env.JUDGE0_URL?.trim() ||
    ((process.env.RAPIDAPI_KEY || process.env.JUDGE0_RAPIDAPI_KEY) ? `https://${RAPID_API_HOST}` : DEFAULT_PUBLIC_JUDGE0_URL)).replace(/\/+$/, "");
}

export function getJudge0Headers(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = process.env.JUDGE0_AUTH_TOKEN?.trim();
  if (token) headers["X-Auth-Token"] = token;
  const key = process.env.RAPIDAPI_KEY?.trim() || process.env.JUDGE0_RAPIDAPI_KEY?.trim();
  if (key && new URL(getJudge0BaseUrl()).hostname === RAPID_API_HOST) {
    headers["X-RapidAPI-Key"] = key;
    headers["X-RapidAPI-Host"] = RAPID_API_HOST;
  }
  return headers;
}

export class CodeRunnerUnavailableError extends Error {
  constructor() {
    super("The code runner is temporarily unavailable. Please try again. Your progress has not changed.");
  }
}

export interface Judge0ExecutionResponse {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  memory?: number;
  status: { id: number; description: string };
  message?: string | null;
}

export async function executeJudge0Submission(sourceCode: string, languageId: number, stdin = ""): Promise<Judge0ExecutionResponse> {
  if (pendingExecutions >= MAX_PENDING_EXECUTIONS) throw new CodeRunnerUnavailableError();
  pendingExecutions++;
  const deadline = Date.now() + EXECUTION_TIMEOUT_MS;
  try {
    const base = getJudge0BaseUrl();
    const headers = getJudge0Headers();
    const request = async (url: string, init?: RequestInit) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new CodeRunnerUnavailableError();
      const response = await fetch(url, { ...init, headers, redirect: "error", signal: AbortSignal.timeout(Math.min(10_000, remaining)) });
      if (!response.ok) throw new CodeRunnerUnavailableError();
      return await response.json();
    };

    // Async submissions work even when Judge0 disables wait=true. Base64 also
    // preserves Unicode and compiler output that isn't valid JSON text directly.
    let data = await request(`${base}/submissions?base64_encoded=true&wait=false`, {
      method: "POST",
      body: JSON.stringify({ source_code: Buffer.from(sourceCode).toString("base64"), language_id: languageId,
        stdin: Buffer.from(stdin).toString("base64"), enable_network: false }),
    });
    const token = data.token;
    while (!data.status || data.status.id === 1 || data.status.id === 2) {
      if (typeof token !== "string" || !/^[a-zA-Z0-9-]+$/.test(token)) throw new CodeRunnerUnavailableError();
      if (data.status) await new Promise(resolve => setTimeout(resolve, 300));
      data = await request(`${base}/submissions/${token}?base64_encoded=true&fields=stdout,stderr,compile_output,time,memory,status`);
    }
    if (!Number.isInteger(data.status.id) || data.status.id < 3 || data.status.id > 14 || data.status.id === 13) throw new CodeRunnerUnavailableError();
    const decode = (value: unknown): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value !== "string") throw new CodeRunnerUnavailableError();
      return Buffer.from(value, "base64").toString("utf8");
    };
    return { stdout: decode(data.stdout), stderr: decode(data.stderr), compile_output: decode(data.compile_output),
      time: String(data.time ?? "0"), memory: data.memory,
      status: { id: data.status.id, description: String(data.status.description ?? "Execution finished") } };
  } catch {
    // Never turn an outage into a failed student test or execute code on the web host.
    throw new CodeRunnerUnavailableError();
  } finally {
    pendingExecutions--;
  }
}
