import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { checkActivityEligibility } from "@/lib/activity-eligibility";

// We assume Judge0 is running on localhost:2358 in dev (as per docker-compose).
// In production, this would be an environment variable.
const JUDGE0_BASE_URL = process.env.JUDGE0_URL || "http://localhost:2358";
const JUDGE0_AUTH_TOKEN = process.env.JUDGE0_AUTH_TOKEN || "";

export async function POST(req: Request) {
  try {
    // 1. Session check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Eligibility Guard (ICS students only)
    const eligibility = await checkActivityEligibility();
    if (!eligibility || !eligibility.eligible) {
      return NextResponse.json({ error: "Forbidden: Not eligible for activities" }, { status: 403 });
    }

    // 3. Parse input
    const body = await req.json();
    const { source_code, language_id, stdin } = body;

    if (!source_code || !language_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 4. Submit to Judge0
    const submitHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (JUDGE0_AUTH_TOKEN) {
      submitHeaders["X-Auth-Token"] = JUDGE0_AUTH_TOKEN;
    }

    const submitRes = await fetch(`${JUDGE0_BASE_URL}/submissions?base64_encoded=false&wait=true`, {
      method: "POST",
      headers: submitHeaders,
      body: JSON.stringify({
        source_code,
        language_id,
        stdin: stdin || "",
        // Defaults as per implementation plan:
        cpu_time_limit: 5.0,
        memory_limit: 128000,
      }),
    });

    if (!submitRes.ok) {
      console.error("Judge0 Submission Error:", await submitRes.text());
      return NextResponse.json({ error: "Failed to submit to execution engine" }, { status: 502 });
    }

    const result = await submitRes.json();

    // The token-based wait=true already gives us the result. 
    // If it didn't (e.g. timeout on wait), we would poll, but wait=true is sufficient for our 5s limit.
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Judge0 API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
