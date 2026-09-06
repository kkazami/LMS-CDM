/**
 * judge0-config.ts
 *
 * Centralized configuration and resilient execution client for Judge0 / CodeLab.
 *
 * Zero-Prerequisite Architecture:
 *   1. Uses process.env.JUDGE0_URL if explicitly provided (e.g. self-hosted instance).
 *   2. Defaults to the official, public Judge0 Community Edition cloud endpoint (https://ce.judge0.com).
 *   3. Requires NO local Docker, NO local compiler binaries (g++, javac, dotnet, python),
 *      and runs 100% serverlessly on Vercel out-of-the-box.
 *   4. Seamlessly falls back to in-process sandbox for JavaScript (Node.js vm).
 */

import { executeLocally, LocalExecutionResult } from "./local-runner";

export const DEFAULT_PUBLIC_JUDGE0_URL = "https://ce.judge0.com";

/**
 * Resolves the primary Judge0 endpoint URL.
 */
export function getJudge0BaseUrl(): string {
  const envUrl = process.env.JUDGE0_URL?.trim();
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl.replace(/\/+$/, "");
  }
  // In production / Vercel or when localhost docker is not guaranteed, use public CE cloud
  return envUrl ? envUrl.replace(/\/+$/, "") : DEFAULT_PUBLIC_JUDGE0_URL;
}

/**
 * Builds HTTP headers for Judge0 requests.
 */
export function getJudge0Headers(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = process.env.JUDGE0_AUTH_TOKEN?.trim();
  if (token) {
    headers["X-Auth-Token"] = token;
  }

  const rapidApiKey = process.env.RAPIDAPI_KEY?.trim() || process.env.JUDGE0_RAPIDAPI_KEY?.trim();
  if (rapidApiKey) {
    headers["X-RapidAPI-Key"] = rapidApiKey;
    headers["X-RapidAPI-Host"] = "judge0-ce.p.rapidapi.com";
  }

  return headers;
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

/**
 * Executes a code snippet against Judge0 with automatic fallback to public CE & in-process engines.
 */
export async function executeJudge0Submission(
  sourceCode: string,
  languageId: number,
  stdin: string = ""
): Promise<Judge0ExecutionResponse> {
  // Fast in-process execution for JavaScript
  if (languageId === 93) {
    try {
      const localJs = await executeLocally(sourceCode, languageId, stdin);
      if (localJs.status.id === 3 || localJs.status.id === 11) {
        return {
          stdout: localJs.stdout,
          stderr: localJs.stderr,
          compile_output: localJs.compile_output,
          time: localJs.time,
          memory: localJs.memory,
          status: localJs.status,
        };
      }
    } catch {
      // Fall through to cloud
    }
  }

  const primaryUrl = getJudge0BaseUrl();
  const headers = getJudge0Headers();

  // Helper fetch with timeout
  const postToJudge0 = async (url: string, hdrs: Record<string, string>, timeoutMs: number): Promise<Judge0ExecutionResponse | null> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${url}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: hdrs,
        signal: controller.signal,
        body: JSON.stringify({
          source_code: sourceCode,
          language_id: languageId,
          stdin: stdin || "",
        }),
      });

      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as Judge0ExecutionResponse;
        if (data.status?.id !== 13) {
          return data;
        }
      }
      return null;
    } catch {
      clearTimeout(timeout);
      return null;
    }
  };

  // 1. Try Primary URL (timeout 4s)
  const primaryResult = await postToJudge0(primaryUrl, headers, 4000);
  if (primaryResult) return primaryResult;

  // 2. If Primary failed or was localhost, try public Judge0 CE cloud (timeout 6s)
  if (primaryUrl !== DEFAULT_PUBLIC_JUDGE0_URL) {
    const publicResult = await postToJudge0(DEFAULT_PUBLIC_JUDGE0_URL, { "Content-Type": "application/json" }, 6000);
    if (publicResult) return publicResult;
  }

  // 3. Fallback to local execution runner (handles Python/JS/SQL/diagnostics)
  const localRes: LocalExecutionResult = await executeLocally(sourceCode, languageId, stdin);
  return {
    stdout: localRes.stdout,
    stderr: localRes.stderr,
    compile_output: localRes.compile_output,
    time: localRes.time,
    memory: localRes.memory,
    status: localRes.status,
  };
}
