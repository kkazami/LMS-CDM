import { NextResponse } from "next/server";
import { executeRiskScan } from "@/lib/ite/risk-scan-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel function timeout (seconds)

/**
 * GET /api/cron/risk-scan
 *
 * Nightly cron that:
 * 1. Iterates all active ITE courses
 * 2. Recomputes risk for each APPROVED, non-new student
 * 3. Sends alert notifications on escalation or sustained HIGH
 * 4. Sends a digest to the course instructor (one per course, never empty)
 * 5. Returns a summary { scanned, updated, alertsSent } (or dry-run simulation)
 *
 * Schedule: "0 2 * * *" (02:00 UTC daily, which corresponds to 10:00 AM Philippine Standard Time / UTC+8).
 *
 * Authentication: Authorization: Bearer ${CRON_SECRET}
 */
export async function GET(request: Request) {
  // ── Auth ───────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ message: "CRON_SECRET not configured." }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  // Parse dryRun query parameter
  const { searchParams } = new URL(request.url);
  const dryRunParam = searchParams.get("dryRun");

  // Dry-run mode performs no database writes (no notifications, no risk assessment upserts or updates).
  const dryRun = dryRunParam === "1" || dryRunParam?.toLowerCase() === "true";

  try {
    const result = await executeRiskScan({ dryRun });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[RISK_SCAN_CRON_ERROR]", err);
    return NextResponse.json(
      { message: "Internal error during scan.", dryRun },
      { status: 500 }
    );
  }
}
