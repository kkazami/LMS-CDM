import { timingSafeEqual } from "node:crypto";
import { processInvitations } from "@/lib/roster/invitations";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + (secret ?? ""));
  if (
    !secret ||
    secret.length < 32 ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  try {
    return Response.json(await processInvitations(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { message: "Email processing unavailable." },
      { status: 503 },
    );
  }
}
