import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { assertMutationOrigin, AccessError } from "@/lib/super-user-v1/actor";
import { lockAccounts } from "@/lib/super-user-v1/account-lock";
import { getClientIp } from "@/lib/rate-limit";
import { inspectActivation, completeActivation } from "@/lib/roster/activation";
import { persistentLimit } from "@/lib/roster/rate-limit";
import { pendingStudent } from "@/lib/roster/invitation-rules";
import { enqueueOne, senderStatus } from "@/lib/roster/invitations";
import { boundedJson, rosterError } from "@/lib/roster/policy";
export const dynamic = "force-dynamic";
export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  try {
    assertMutationOrigin(request);
    await persistentLimit("activation-ip:" + getClientIp(request), 30, 3600000);
    const { operation } = await context.params,
      body = await boundedJson(request, 8192);
    if (operation === "inspect") {
      const input = z.object({ token: z.string() }).strict().safeParse(body);
      if (!input.success)
        throw new AccessError(400, "Invalid activation link.");
      return Response.json(await inspectActivation(input.data.token), {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    }
    if (operation === "complete")
      return Response.json(await completeActivation(body), {
        headers: { "Cache-Control": "no-store" },
      });
    if (operation !== "request")
      return Response.json({ message: "Not found." }, { status: 404 });
    const input = z
      .object({ email: z.string().trim().toLowerCase().email().max(254) })
      .strict()
      .safeParse(body);
    if (!input.success)
      throw new AccessError(400, "Enter a valid email address.");
    await persistentLimit("activation-email:" + input.data.email, 3, 3600000);
    const generic = {
      message:
        "If an eligible account exists, a new activation invitation will be queued. Please check your registered email address.",
    };
    if (!(await senderStatus()).ready) return Response.json(generic);
    const user = await db.user.findFirst({
      where: { email: { equals: input.data.email, mode: "insensitive" } },
    });
    if (user)
      await db.$transaction(async (tx) => {
        await lockAccounts(tx, [user.id]);
        const current = await tx.user.findUnique({ where: { id: user.id } });
        if (
          current &&
          current.email === input.data.email &&
          pendingStudent(current)
        )
          await enqueueOne(tx, current, null, randomUUID());
      });
    return Response.json(generic, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return rosterError(error);
  }
}
