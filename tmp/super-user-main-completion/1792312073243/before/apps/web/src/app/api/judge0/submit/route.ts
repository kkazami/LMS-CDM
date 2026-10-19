import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { checkActivityEligibility } from "@/lib/activity-eligibility";
import { wrapStudentCode, WrapperLanguage } from "@/features/interactive-activities/codelab/utils/code-wrappers";
import { executeJudge0Submission } from "@/features/interactive-activities/codelab/utils/judge0-config";

export const dynamic = "force-dynamic";

// ─── Security Constants ───

/** Maximum source code size in bytes (64 KB) */
const MAX_SOURCE_CODE_BYTES = 64 * 1024;

/** Maximum submissions per user within the rate limit window */
const RATE_LIMIT_MAX = 30;

/** Rate limit window in milliseconds (5 minutes) */
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/**
 * Allowed Judge0 language IDs — reject anything not in this set.
 * Maps to: Python 3 (71), C++ (54), C# (51), Java (62), JS/Node 18 (93), SQL (82)
 */
const ALLOWED_LANGUAGE_IDS = new Set<number>([71, 54, 51, 62, 93, 82]);

// ─── In-Memory Rate Limiter ───

interface RateLimitEntry {
  timestamps: number[];
}

/** Per-user submission timestamps for rate limiting. */
const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Checks whether a user has exceeded the submission rate limit.
 * Prunes expired timestamps on each check.
 *
 * @returns true if the user is within limits; false if rate-limited
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;

  let entry = rateLimitMap.get(userId);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(userId, entry);
  }

  // Prune timestamps older than the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

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

    // 3. Per-user rate limit
    const userId = session.user.id;
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Maximum 30 submissions per 5 minutes.",
          retryAfterSeconds: 300,
        },
        { status: 429 }
      );
    }

    // 4. Parse input
    const body = await req.json();
    const { source_code, language_id, stdin } = body as {
      source_code: string | undefined;
      language_id: number | undefined;
      stdin: string | undefined;
    };

    if (!source_code || !language_id) {
      return NextResponse.json({ error: "Missing required fields: source_code and language_id" }, { status: 400 });
    }

    // 5. Payload size check (64 KB max)
    const sourceBytes = new TextEncoder().encode(source_code).length;
    if (sourceBytes > MAX_SOURCE_CODE_BYTES) {
      return NextResponse.json(
        {
          error: `Source code exceeds maximum size of ${MAX_SOURCE_CODE_BYTES / 1024} KB.`,
          maxBytes: MAX_SOURCE_CODE_BYTES,
          actualBytes: sourceBytes,
        },
        { status: 413 }
      );
    }

    // 6. Language allowlist check
    if (!ALLOWED_LANGUAGE_IDS.has(language_id)) {
      return NextResponse.json(
        {
          error: `Unsupported language_id: ${language_id}. Allowed IDs: ${Array.from(ALLOWED_LANGUAGE_IDS).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 7. Submit to Judge0 with automatic cloud CE & in-process fallback handling
    function getLanguageFromId(id: number): WrapperLanguage {
      switch (id) {
        case 71: return "python";
        case 93: return "javascript";
        case 54: return "cpp";
        case 62: return "java";
        case 51: return "csharp";
        case 82: return "sql";
        default: return "python";
      }
    }

    const wrapperLang = getLanguageFromId(language_id);
    const executableCode = wrapStudentCode(wrapperLang, source_code, null, stdin || "");

    const result = await executeJudge0Submission(executableCode, language_id, stdin || "");
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Judge0 API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
