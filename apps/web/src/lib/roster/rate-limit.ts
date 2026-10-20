import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/super-user-v1/actor";

export async function persistentLimit(
  key: string,
  max: number,
  windowMs: number,
) {
  const hashed = createHash("sha256").update(key).digest("hex");
  const rows = await db.$queryRaw<Array<{ count: number }>>`
    INSERT INTO "RateLimitBucket" (key, count, "expiresAt") VALUES (${hashed}, 1, clock_timestamp() + ${windowMs} * interval '1 millisecond')
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimitBucket"."expiresAt" <= clock_timestamp() THEN 1 ELSE "RateLimitBucket".count + 1 END,
      "expiresAt" = CASE WHEN "RateLimitBucket"."expiresAt" <= clock_timestamp() THEN EXCLUDED."expiresAt" ELSE "RateLimitBucket"."expiresAt" END
    RETURNING count`;
  if (rows[0].count > max)
    throw new AccessError(429, "Too many attempts. Please try again later.");
}
