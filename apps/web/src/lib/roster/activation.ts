import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/auth-schema";
import { lockAccounts } from "@/lib/super-user-v1/account-lock";
import { AccessError } from "@/lib/super-user-v1/actor";
import { grantMatches } from "./invitation-rules";
import { adminTransaction, audit, type RosterActor } from "./policy";

export const tokenInput = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/, "Invalid or expired activation link.");
export const tokenDigest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
const invalid = () =>
  new AccessError(
    400,
    "This activation link is invalid or has expired. Request a new link.",
  );
export async function inspectActivation(raw: string) {
  if (!tokenInput.safeParse(raw).success) throw invalid();
  const grant = await db.accountActivationToken.findUnique({
    where: { tokenHash: tokenDigest(raw) },
    include: { user: { include: { institute: true } } },
  });
  if (!grant || !grantMatches(grant, grant.user)) throw invalid();
  return { name: grant.user.name, email: grant.user.email, instituteCode: grant.user.institute.code };
}
const completeInput = z
  .object({
    token: tokenInput,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, "Passwords do not match.");
export async function completeActivation(body: unknown) {
  const parsed = completeInput.safeParse(body);
  if (!parsed.success)
    throw new AccessError(400, parsed.error.issues[0].message);
  const grant = await db.accountActivationToken.findUnique({
    where: { tokenHash: tokenDigest(parsed.data.token) },
    select: { userId: true },
  });
  if (!grant) throw invalid();
  const password = await hash(parsed.data.password, 12);
  return db.$transaction(async (tx) => {
    await lockAccounts(tx, [grant.userId]);
    const current = await tx.accountActivationToken.findUnique({
      where: { tokenHash: tokenDigest(parsed.data.token) },
      include: { user: { include: { institute: true } } },
    });
    if (!current || !grantMatches(current, current.user)) throw invalid();
    const now = new Date();
    const consumed = await tx.accountActivationToken.updateMany({
      where: {
        id: current.id,
        consumedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw invalid();
    await tx.user.update({
      where: { id: current.userId },
      data: { password, activationStatus: "ACTIVE", activatedAt: now },
    });
    await tx.accountActivationToken.updateMany({
      where: { userId: current.userId, consumedAt: null, revokedAt: null },
      data: { revokedAt: now },
    });
    await tx.emailJob.updateMany({
      where: {
        userId: current.userId,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
      data: { status: "CANCELLED" },
    });
    await tx.session.deleteMany({ where: { userId: current.userId } });
    await tx.passwordResetOtp.updateMany({
      where: { userId: current.userId, isUsed: false },
      data: { isUsed: true },
    });
    await audit(tx, current.userId, current.userId, "ACCOUNT_ACTIVATED", {
      invitationVersion: current.invitationVersion,
    });
    return { instituteCode: current.user.institute.code };
  });
}
const correctionInput = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    reason: z.string().trim().min(3).max(500),
    invitationVersion: z.number().int().min(0),
  })
  .strict();
export async function correctPendingEmail(
  actor: RosterActor,
  id: string,
  body: unknown,
) {
  const parsed = correctionInput.safeParse(body);
  if (!parsed.success)
    throw new AccessError(
      400,
      "Provide a valid email, correction reason, and current invitation version.",
    );
  return adminTransaction(actor, async (tx) => {
    await lockAccounts(tx, [id]);
    const user = await tx.user.findFirst({
      where: { id, instituteId: actor.instituteId, role: "STUDENT" },
    });
    if (!user) throw new AccessError(404, "Student not found.");
    if (
      user.activationStatus !== "PENDING_ACTIVATION" ||
      user.invitationVersion !== parsed.data.invitationVersion
    )
      throw new AccessError(
        409,
        "Account changed or was activated. Refresh before editing.",
      );
    if (user.email === parsed.data.email)
      throw new AccessError(400, "Enter a different email address.");
    if (
      await tx.user.findFirst({
        where: {
          email: { equals: parsed.data.email, mode: "insensitive" },
          id: { not: id },
        },
      })
    )
      throw new AccessError(409, "Email is already in use.");
    await tx.user.update({
      where: { id },
      data: { email: parsed.data.email, invitationVersion: { increment: 1 } },
    });
    await tx.accountActivationToken.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.emailJob.updateMany({
      where: { userId: id, status: { in: ["QUEUED", "PROCESSING"] } },
      data: { status: "CANCELLED" },
    });
    await tx.passwordResetOtp.updateMany({
      where: { userId: id, isUsed: false },
      data: { isUsed: true },
    });
    await tx.session.deleteMany({ where: { userId: id } });
    await audit(tx, actor.id, id, "PENDING_EMAIL_CORRECTED", {
      oldEmail: user.email,
      newEmail: parsed.data.email,
      reason: parsed.data.reason,
      invitationVersion: user.invitationVersion + 1,
    });
    return {
      message:
        "Email updated. Old setup links no longer work. Send a new invitation to the updated address.",
    };
  }, { requireStudentIds: false });
}
