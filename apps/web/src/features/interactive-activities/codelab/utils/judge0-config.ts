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
 * Automatically avoids defaulting to http://localhost:2358 in production / Vercel.
 */
export function getJudge0BaseUrl(): string {
  const envUrl = process.env.JUDGE0_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }
  // In production (Vercel) or when no custom URL is specified, default to public CE cloud
  return DEFAULT_PUBLIC_JUDGE0_URL;
}

/**
 * Builds HTTP headers for Judge0 requests (supporting custom tokens, RapidAPI keys, etc.).
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
  const primaryUrl = getJudge0BaseUrl();
  const headers = getJudge0Headers();

  // Try Primary Judge0 URL
  try {
    const res = await fetch(`${primaryUrl}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        source_code: sourceCode,
        language_id: languageId,
        stdin: stdin || "",
        cpu_time_limit: 5.0,
        memory_limit: 128000,
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as Judge0ExecutionResponse;
      // Status 13 is internal error in Judge0; if not 13, return result
      if (data.status?.id !== 13) {
        return data;
      }
      console.warn("Primary Judge0 returned internal error:", data.message);
    } else {
      console.warn(`Primary Judge0 returned HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    }
  } catch (err: unknown) {
    console.warn(`Primary Judge0 request failed (${primaryUrl}):`, err);
  }

  // If primary was a custom URL and failed, attempt public CE endpoint as secondary cloud fallback
  if (primaryUrl !== DEFAULT_PUBLIC_JUDGE0_URL) {
    try {
      const fallbackRes = await fetch(`${DEFAULT_PUBLIC_JUDGE0_URL}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: sourceCode,
          language_id: languageId,
          stdin: stdin || "",
          cpu_time_limit: 5.0,
          memory_limit: 128000,
        }),
      });

      if (fallbackRes.ok) {
        const data = (await fallbackRes.json()) as Judge0ExecutionResponse;
        if (data.status?.id !== 13) {
          return data;
        }
      }
    } catch (fallbackErr: unknown) {
      console.warn("Secondary public Judge0 request failed:", fallbackErr);
    }
  }

  // Fallback to local / in-process runner (e.g. Node.js VM for JavaScript)
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
