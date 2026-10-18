/**
 * judge0-client.ts
 *
 * Client-side utility for interacting with our Next.js API proxy for Judge0.
 * We do not hit Judge0 directly from the browser to protect the API tokens in production.
 */

export interface CodeSubmissionResponse {
  stdout: string | null;
  stderr: string | null;
  compile_output: string | null;
  time: string;
  memory: number;
  status: { id: number; description: string };
  errorLog?: string[];
}

export async function submitToJudge0(
  sourceCode: string,
  languageId: number,
  stdin?: string
): Promise<CodeSubmissionResponse> {
  const res = await fetch("/api/judge0/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to execute code against Judge0");
  }

  return res.json();
}
