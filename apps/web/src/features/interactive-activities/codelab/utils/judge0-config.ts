/** Shared, sandboxed execution for every CodeLab language. */
const RAPID_API_HOST = "judge0-ce.p.rapidapi.com";
const EXECUTION_TIMEOUT_MS = 30_000;
// Bound work across requests within a warm web process. Multi-instance quotas belong at the worker service.
let pendingExecutions = 0;
const MAX_PENDING_EXECUTIONS = 4;

export function getJudge0BaseUrl(): string {
  const key = process.env.JUDGE0_RAPIDAPI_KEY?.trim() || process.env.RAPIDAPI_KEY?.trim();
  const configured = process.env.JUDGE0_URL?.trim();
  if (!configured && !key) throw new CodeRunnerUnavailableError();
  const base = (configured || `https://${RAPID_API_HOST}`).replace(/\/+$/, "");
  let url: URL;
  try { url = new URL(base); } catch { throw new CodeRunnerUnavailableError(); }
  // Server-only, authenticated HTTPS origin; no public-demo or localhost fallback.
  if (url.protocol !== 'https:' || url.origin !== base || url.username || url.password || url.hostname === 'ce.judge0.com') throw new CodeRunnerUnavailableError();
  if (url.hostname === RAPID_API_HOST ? !key : !process.env.JUDGE0_AUTH_TOKEN?.trim()) throw new CodeRunnerUnavailableError();
  return base;
}

export function getJudge0Headers(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const host = new URL(getJudge0BaseUrl()).hostname;
  const token = process.env.JUDGE0_AUTH_TOKEN?.trim();
  if (token && host !== RAPID_API_HOST) headers["X-Auth-Token"] = token;
  const key = process.env.JUDGE0_RAPIDAPI_KEY?.trim() || process.env.RAPIDAPI_KEY?.trim();
  if (key && host === RAPID_API_HOST) {
    headers["X-RapidAPI-Key"] = key;
    headers["X-RapidAPI-Host"] = RAPID_API_HOST;
  }
  return headers;
}

export class CodeRunnerUnavailableError extends Error {
  constructor(message = "The code runner is temporarily unavailable. Please try again. Your progress has not changed.") {
    super(message);
  }
}

// Pinned versions from JDoodle's language catalog, using the existing CodeLab IDs.
const JDOODLE_LANGUAGES: Record<number, { language: string; versionIndex: string }> = {
  54: { language: "cpp17", versionIndex: "1" },
  62: { language: "java", versionIndex: "4" },
  51: { language: "csharp", versionIndex: "4" },
  71: { language: "python3", versionIndex: "5" },
  93: { language: "nodejs", versionIndex: "5" },
  82: { language: "sql", versionIndex: "5" },
};

async function executeJDoodle(sourceCode: string, languageId: number, stdin: string, deadline: number): Promise<Judge0ExecutionResponse> {
  const clientId = process.env.JDOODLE_CLIENT_ID?.trim();
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET?.trim();
  const language = JDOODLE_LANGUAGES[languageId];
  if (!clientId || !clientSecret) throw new CodeRunnerUnavailableError('JDoodle is not configured on this server. Ask the administrator to add its client ID and secret, then restart or redeploy the app.');
  if (!language) throw new CodeRunnerUnavailableError('This language is not configured for JDoodle. Your progress has not changed.');
  const response = await fetch("https://api.jdoodle.com/v1/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
    body: JSON.stringify({ clientId, clientSecret, script: sourceCode, stdin, ...language }),
  }).catch((error: unknown) => {
    const cause = error as { name?: string; cause?: { code?: string } };
    console.error('JDOODLE_CONNECTION_ERROR', { name: cause.name, code: cause.cause?.code });
    throw new CodeRunnerUnavailableError('The server could not reach JDoodle. Please try again shortly. Your progress has not changed.');
  });
  const data = await response.json().catch(() => null);
  if ([401, 403].includes(response.status) || [401, 403].includes(data?.statusCode)) {
    throw new CodeRunnerUnavailableError('JDoodle rejected this server’s API credentials. Ask the administrator to check the configured client ID and secret.');
  }
  if (response.status === 429 || data?.statusCode === 429) {
    throw new CodeRunnerUnavailableError("The daily code-running limit has been reached. Try again after the daily reset. Your progress has not changed.");
  }
  if (!response.ok || !data || data.statusCode !== 200 || data.error || typeof data.output !== "string") throw new CodeRunnerUnavailableError('JDoodle could not complete the request. Please try again shortly. Your progress has not changed.');
  // JDoodle combines output and compiler diagnostics. Grading still compares the
  // complete output with each expected result; HTTP success never awards credit.
  return {
    stdout: data.output, stderr: null, compile_output: null,
    time: String(data.cpuTime ?? "0"),
    memory: data.memory == null ? undefined : Number(data.memory),
    status: { id: 3, description: "Execution finished" },
  };
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

export async function executeJudge0Submission(sourceCode: string, languageId: number, stdin = "", requestDeadline = Infinity): Promise<Judge0ExecutionResponse> {
  if (pendingExecutions >= MAX_PENDING_EXECUTIONS) throw new CodeRunnerUnavailableError('All code runners are busy. Try again in a few seconds. Your progress has not changed.');
  pendingExecutions++;
  const deadline = Math.min(Date.now() + EXECUTION_TIMEOUT_MS, requestDeadline);
  try {
    if (Date.now() >= deadline) throw new CodeRunnerUnavailableError('Code evaluation timed out. Your progress has not changed.');
    const provider = process.env.CODELAB_RUNNER?.trim().toLowerCase() || "judge0";
    if (![54, 62, 51, 71, 93, 82].includes(languageId)) throw new CodeRunnerUnavailableError('This language is not configured for CodeLab.');
    if (provider === "jdoodle") return await executeJDoodle(sourceCode, languageId, stdin, deadline);
    if (provider !== "judge0" && provider !== "onlinecompiler") throw new CodeRunnerUnavailableError();
    const online = provider === "onlinecompiler";
    const onlineKey = process.env.ONLINECOMPILER_API_KEY?.trim();
    if (online && !onlineKey) throw new CodeRunnerUnavailableError('OnlineCompiler.io is not configured on this server. Ask the administrator to add its API key and redeploy.');
    const base = online ? 'https://api.onlinecompiler.io/api/judge0' : getJudge0BaseUrl();
    const headers = online ? { 'Content-Type': 'application/json', 'X-Auth-Token': onlineKey! } : getJudge0Headers();
    const request = async (url: string, init?: RequestInit) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new CodeRunnerUnavailableError();
      const response = await fetch(url, { ...init, headers, redirect: "error", signal: AbortSignal.timeout(Math.min(10_000, remaining)) });
      if (online && [401, 403].includes(response.status)) throw new CodeRunnerUnavailableError('OnlineCompiler.io rejected the server API key. Ask the administrator to check its configuration.');
      if (online && response.status === 429) throw new CodeRunnerUnavailableError('OnlineCompiler.io is busy or its free running limit has been reached. Try again later. Your progress has not changed.');
      if (!response.ok) throw new CodeRunnerUnavailableError();
      return await response.json();
    };

    // Async submissions work even when Judge0 disables wait=true. Base64 also
    // preserves Unicode and compiler output that isn't valid JSON text directly.
    let data = await request(`${base}/submissions?base64_encoded=true&wait=false`, {
      method: "POST",
      body: JSON.stringify({ source_code: Buffer.from(sourceCode).toString("base64"), language_id: languageId,
        stdin: Buffer.from(stdin).toString("base64"), ...(online ? {} : { enable_network: false }) }),
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
  } catch (error) {
    // Never turn an outage into a failed student test or execute code on the web host.
    if (error instanceof CodeRunnerUnavailableError) throw error;
    throw new CodeRunnerUnavailableError();
  } finally {
    pendingExecutions--;
  }
}
