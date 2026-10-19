import { z } from "zod";
import {
  rosterActor,
  rosterError,
  boundedJson,
  adminTransaction,
  audit,
} from "@/lib/roster/policy";
import {
  enqueueInvitations,
  invitationAccounts,
  deliveryEstimate,
} from "@/lib/roster/invitations";
import { verifySmtp } from "@/lib/mailer";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  try {
    const actor = await rosterActor(request, { requireStudentIds: false }),
      estimate = new URL(request.url).searchParams.get("additional");
    if (estimate !== null)
      return Response.json(
        await deliveryEstimate(
          Math.min(500, Math.max(0, Number(estimate) || 0)),
        ),
        { headers: { "Cache-Control": "private, no-store" } },
      );
    return Response.json(await invitationAccounts(actor), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return rosterError(error);
  }
}
export async function POST(request: Request) {
  try {
    return Response.json(
      await enqueueInvitations(
        await rosterActor(request, { requireStudentIds: false }),
        await boundedJson(request, 65536),
      ),
    );
  } catch (error) {
    return rosterError(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const actor = await rosterActor(request, { requireStudentIds: false });
    z.object({ action: z.literal("VERIFY_AND_RESUME") })
      .strict()
      .parse(await boundedJson(request, 8192));
    await verifySmtp();
    await adminTransaction(actor, async (tx) => {
      await tx.emailSenderState.upsert({
        where: { id: "invitations" },
        create: { id: "invitations", smtpVerifiedAt: new Date() },
        update: {
          smtpVerifiedAt: new Date(),
          pausedUntil: null,
          pauseReason: null,
        },
      });
      await audit(tx, actor.id, actor.id, "INVITATION_SENDER_RESUMED", {});
    }, { requireStudentIds: false });
    return Response.json({ message: "Email connection checked. Delivery can resume once setup is complete." });
  } catch (error) {
    return rosterError(error);
  }
}
