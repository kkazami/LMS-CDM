import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/super-user-v1/actor";

function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const record = err as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  if (
    code === "P2010" ||
    code === "P1001" ||
    code === "P1008" ||
    code === "P1017" ||
    code === "ECONNRESET" ||
    code === "ETIMEDOUT"
  ) {
    return true;
  }
  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";
  return (
    message.includes("connection timeout") ||
    message.includes("connection terminated") ||
    message.includes("socket hang up")
  );
}

export async function persistentLimit(
  key: string,
  max: number,
  windowMs: number,
) {
  const hashed = createHash("sha256").update(key).digest("hex");
  const runQuery = () =>
    db.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "RateLimitBucket" (key, count, "expiresAt") VALUES (${hashed}, 1, clock_timestamp() + ${windowMs} * interval '1 millisecond')
      ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimitBucket"."expiresAt" <= clock_timestamp() THEN 1 ELSE "RateLimitBucket".count + 1 END,
        "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= clock_timestamp() THEN EXCLUDED."expiresAt" ELSE "RateLimitBucket"."expiresAt" END
      RETURNING count`;

  let rows: Array<{ count: number }>;
  try {
    rows = await runQuery();
  } catch (err) {
    if (!isTransientDbError(err)) throw err;
    await new Promise((resolve) => setTimeout(resolve, 150));
    rows = await runQuery();
  }

  if (rows[0].count > max)
    throw new AccessError(429, "Too many attempts. Please try again later.");
}
