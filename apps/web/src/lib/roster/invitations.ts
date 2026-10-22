import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/super-user-v1/actor";
import { lockAccounts } from "@/lib/super-user-v1/account-lock";
import {
  sendEmail,
  verifySmtp,
  smtpConfigured,
  MailDeliveryError,
  type SendEmailOptions,
} from "@/lib/mailer";
import { adminTransaction, audit, type RosterActor, type Tx } from "./policy";
import { tokenDigest } from "./activation";
import { activationEmail } from "./activation-email";
import {
  LINK_LIFETIME_MS,
  REMINDER_DELAY_MS,
  RETRY_DELAYS_MS,
  pendingStudent,
  estimateDelivery,
} from "./invitation-rules";

const SENDER = "invitations";
export const dailyCap = () =>
  Math.max(1, Math.min(10000, Number(process.env.EMAIL_DAILY_LIMIT) || 400));
const enabled = () => process.env.EMAIL_INVITATIONS_ENABLED === "true";
function applicationUrl() {
  const url = new URL(process.env.APP_BASE_URL ?? "");
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(
        process.env.NODE_ENV !== "production" &&
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      ))
  )
    throw new Error("Invalid application URL.");
  return url;
}
export async function senderStatus() {
  const state = await db.emailSenderState.findUnique({ where: { id: SENDER } });
  const healthy = Boolean(
    state?.lastHeartbeatAt &&
      Date.now() - state.lastHeartbeatAt.getTime() <= 180000,
  );
  const paused = Boolean(state?.pausedUntil && state.pausedUntil > new Date());
  const verified = Boolean(
    state?.smtpVerifiedAt &&
      Date.now() - state.smtpVerifiedAt.getTime() < 15 * 60000,
  );
  let configurationError: string | null = smtpConfigured()
    ? null
    : "The sending email account has not been set up.";
  try {
    applicationUrl();
  } catch {
    configurationError =
      "The website address for account activation links has not been set up.";
  }
  return {
    enabled: enabled(),
    healthy,
    verified,
    paused,
    configurationError,
    ready: enabled() && healthy && !paused && verified && !configurationError,
    lastHeartbeatAt: state?.lastHeartbeatAt,
    lastProcessedAt: state?.lastProcessedAt,
    pauseReason: state?.pauseReason,
    pausedUntil: state?.pausedUntil,
    dailyLimit: dailyCap(),
  };
}
export async function enqueueOne(
  tx: Tx,
  user: { id: string; instituteId: string; invitationVersion: number },
  requestedById: string | null,
  requestId: string,
) {
  const key = requestId + ":" + user.id + ":" + user.invitationVersion;
  if (await tx.emailJob.findUnique({ where: { dedupeKey: key } })) return false;
  // A manual resend supersedes a scheduled reminder, not an in-flight invitation.
  await tx.emailJob.updateMany({
    where: {
      userId: user.id,
      invitationVersion: user.invitationVersion,
      purpose: "REMINDER",
      status: "QUEUED",
    },
    data: { status: "CANCELLED" },
  });
  if (
    await tx.emailJob.findFirst({
      where: {
        userId: user.id,
        invitationVersion: user.invitationVersion,
        status: { in: ["QUEUED", "PROCESSING"] },
      },
    })
  )
    return false;
  await tx.emailJob.create({
    data: {
      userId: user.id,
      instituteId: user.instituteId,
      invitationVersion: user.invitationVersion,
      requestedById,
      dedupeKey: key,
    },
  });
  if (requestedById)
    await audit(tx, requestedById, user.id, "INVITATION_QUEUED", {
      requestId,
      invitationVersion: user.invitationVersion,
    });
  return true;
}
const invitationInput = z
  .object({
    userIds: z.array(z.string()).min(1).max(500),
    requestId: z.string().uuid(),
  })
  .strict();
export async function enqueueInvitations(actor: RosterActor, body: unknown) {
  const input = invitationInput.safeParse(body);
  if (!input.success)
    throw new AccessError(
      400,
      "Select up to 500 students and provide a request ID.",
    );
  if (!(await senderStatus()).ready)
    throw new AccessError(
      503,
      "Email invitations are not ready to send. Check the email connection and delivery status, then try again.",
    );
  const queued = await adminTransaction(actor, async (tx) => {
    const ids = [...new Set(input.data.userIds)].sort();
    await lockAccounts(tx, ids);
    const users = await tx.user.findMany({
      where: { id: { in: ids }, instituteId: actor.instituteId },
    });
    if (
      users.length !== ids.length ||
      users.some((user) => !pendingStudent(user))
    )
      throw new AccessError(
        400,
        "Only pending, unsuspended students in your institute may be invited.",
      );
    const keys = users.map(
      (user) =>
        input.data.requestId + ":" + user.id + ":" + user.invitationVersion,
    );
    const jobs = await tx.emailJob.findMany({
      where: {
        OR: [
          { userId: { in: ids }, status: { in: ["QUEUED", "PROCESSING"] } },
          { userId: { in: ids }, sentAt: { gt: new Date(Date.now() - 60000) } },
          { dedupeKey: { in: keys } },
        ],
      },
    });
    const accepted = users.filter(
      (user) =>
        !jobs.some(
          (job) =>
            job.dedupeKey ===
              input.data.requestId +
                ":" +
                user.id +
                ":" +
                user.invitationVersion ||
            (job.userId === user.id &&
              job.invitationVersion === user.invitationVersion &&
              (job.status === "PROCESSING" ||
                (job.status === "QUEUED" && job.purpose === "INVITATION") ||
                (job.sentAt && job.sentAt > new Date(Date.now() - 60000)))),
        ),
    );
    await tx.emailJob.updateMany({
      where: {
        userId: { in: accepted.map((u) => u.id) },
        purpose: "REMINDER",
        status: "QUEUED",
      },
      data: { status: "CANCELLED" },
    });
    if (!accepted.length) return 0;
    const result = await tx.emailJob.createMany({
      data: accepted.map((user) => ({
        userId: user.id,
        instituteId: user.instituteId,
        invitationVersion: user.invitationVersion,
        requestedById: actor.id,
        dedupeKey:
          input.data.requestId + ":" + user.id + ":" + user.invitationVersion,
      })),
    });
    await tx.auditLog.createMany({
      data: accepted.map((user) => ({
        adminId: actor.id,
        targetId: user.id,
        action: "INVITATION_QUEUED",
        metadata: JSON.stringify({
          requestId: input.data.requestId,
          invitationVersion: user.invitationVersion,
        }),
      })),
    });
    return result.count;
  }, { requireStudentIds: false });
  return { queued, ...(await deliveryEstimate(0)) };
}
export async function deliveryEstimate(additional: number) {
  const state = await senderStatus();
  const [attempts, jobs] = await Promise.all([
    db.emailSendAttempt.findMany({
      where: { startedAt: { gt: new Date(Date.now() - 86400000) } },
      select: { startedAt: true },
      orderBy: { startedAt: "asc" },
    }),
    db.emailJob.findMany({
      where: { status: { in: ["QUEUED", "PROCESSING"] }, OR: [{ purpose: 'INVITATION' }, { scheduledAt: { lte: new Date() } }] },
      select: { scheduledAt: true },
      orderBy: { scheduledAt: "asc" },
    }),
  ]);
  return {
    ...state,
    queuedCount: jobs.length,
    availableToday: Math.max(0, dailyCap() - attempts.length),
    estimatedCompletion: state.ready
      ? new Date(
          estimateDelivery(
            attempts.map((a) => a.startedAt.getTime()),
            jobs.length + additional,
            dailyCap(),
            Date.now(),
            [...jobs.map((j) => j.scheduledAt.getTime()), ...Array<number>(additional).fill(Date.now())].sort((a, b) => a - b),
          ),
        ).toISOString()
      : null,
  };
}
export async function invitationAccounts(actor: RosterActor) {
  const users = await db.user.findMany({
    where: {
      instituteId: actor.instituteId,
      role: { equals: "STUDENT", mode: "insensitive" },
    },
    select: {
      id: true,
      name: true,
      email: true,
      studentNumber: true,
      section: true,
      isActive: true,
      activationStatus: true,
      invitationVersion: true,
      programMemberships: {
        where: { kind: "STUDENT", isActive: true },
        select: { program: { select: { code: true } } },
      },
    },
    orderBy: { name: "asc" },
  });
  const jobs = await db.emailJob.findMany({
    where: {
      instituteId: actor.instituteId,
      userId: { in: users.map((u) => u.id) },
    },
    orderBy: { createdAt: "desc" },
    include: { attempts: { orderBy: { startedAt: "desc" }, take: 1 } },
  });
  const jobsByUser = new Map<string, typeof jobs>();
  for (const job of jobs) {
    const group = jobsByUser.get(job.userId) ?? [];
    group.push(job);
    jobsByUser.set(job.userId, group);
  }
  return {
    users: users.map((u) => {
      const current = (jobsByUser.get(u.id) ?? []).filter(
        (j) =>
          j.invitationVersion === u.invitationVersion &&
          j.status !== "CANCELLED",
      );
      const last = current.find(
        (j) => j.purpose !== "REMINDER" || j.attemptCount > 0,
      );
      return {
        ...u,
        program: u.programMemberships[0]?.program.code ?? "",
        invitationStatus:
          u.activationStatus === "ACTIVE"
            ? "ACTIVATED"
            : !last
              ? "NOT_SENT"
              : last.status === "PROCESSING"
                ? "QUEUED"
                : last.status,
        lastSentAt: current.find((j) => j.sentAt)?.sentAt ?? null,
        lastError: last?.attempts[0]?.errorCode ?? null,
      };
    }),
    sender: await deliveryEstimate(0),
  };
}

export interface MailDriver {
  send: (options: SendEmailOptions) => ReturnType<typeof sendEmail>;
  verify: () => Promise<unknown>;
}
const smtpDriver: MailDriver = { send: sendEmail, verify: verifySmtp };
export async function processInvitations(driver: MailDriver = smtpDriver) {
  const started = Date.now(),
    leaseOwner = randomUUID();
  await db.emailSenderState.upsert({
    where: { id: SENDER },
    create: { id: SENDER, lastHeartbeatAt: new Date() },
    update: { lastHeartbeatAt: new Date() },
  });
  const claim = await db.emailSenderState.updateMany({
    where: {
      id: SENDER,
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
    },
    data: { leaseOwner, leaseUntil: new Date(Date.now() + 120000) },
  });
  if (!claim.count) return { processed: 0, busy: true };
  let processed = 0;
  try {
    let state = await db.emailSenderState.findUniqueOrThrow({
      where: { id: SENDER },
    });
    await db.importBatch.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - 30 * 86400000) } },
    });
    await db.rateLimitBucket.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (state.pausedUntil && state.pausedUntil > new Date())
      return { processed, paused: true };
    if (
      !state.smtpVerifiedAt ||
      Date.now() - state.smtpVerifiedAt.getTime() > 10 * 60000
    ) {
      try {
        await driver.verify();
        await db.emailSenderState.update({
          where: { id: SENDER },
          data: {
            smtpVerifiedAt: new Date(),
            pauseReason: null,
            pausedUntil: null,
          },
        });
      } catch {
        await db.emailSenderState.update({
          where: { id: SENDER },
          data: {
            pauseReason: "SMTP_VERIFICATION_FAILED",
            pausedUntil: new Date(Date.now() + 60000),
            smtpVerifiedAt: null,
          },
        });
        return { processed, paused: true };
      }
    }
    if (!enabled()) return { processed, disabled: true };
    const baseUrl = applicationUrl();
    await db.$transaction(async (tx) => {
      const stale = await tx.emailJob.findMany({
        where: { status: "PROCESSING", leaseUntil: { lt: new Date() } },
        select: { id: true, attemptCount: true },
      });
      for (const job of stale) {
        await tx.emailSendAttempt.updateMany({
          where: { jobId: job.id, outcome: "STARTED" },
          data: {
            outcome: "UNKNOWN",
            completedAt: new Date(),
            errorCode: "WORKER_INTERRUPTED",
          },
        });
        await tx.emailJob.update({
          where: { id: job.id },
          data: {
            status: job.attemptCount >= 5 ? "FAILED" : "QUEUED",
            scheduledAt: new Date(),
            leaseOwner: null,
            leaseUntil: null,
          },
        });
      }
    });
    while (processed < 5 && Date.now() - started < 28000) {
      state = await db.emailSenderState.findUniqueOrThrow({
        where: { id: SENDER },
      });
      const wait = (state.nextSendAt?.getTime() ?? 0) - Date.now();
      if (wait > 1500) break;
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      const preparation = await db.$transaction(async (tx) => {
        const attempts = await tx.emailSendAttempt.findMany({
          where: { startedAt: { gt: new Date(Date.now() - 86400000) } },
          orderBy: { startedAt: "asc" },
          select: { startedAt: true },
        });
        if (attempts.length >= dailyCap()) return null;
        const jobs = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT id FROM "EmailJob" WHERE status='QUEUED' AND "scheduledAt"<=clock_timestamp() ORDER BY "scheduledAt", "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
        if (!jobs.length) return null;
        const job = await tx.emailJob.findUniqueOrThrow({
          where: { id: jobs[0].id },
        });
        await lockAccounts(tx, [job.userId]);
        const user = await tx.user.findUnique({
          where: { id: job.userId },
          include: { institute: { select: { code: true } } },
        });
        if (
          !user ||
          !pendingStudent(user) ||
          user.invitationVersion !== job.invitationVersion ||
          user.instituteId !== job.instituteId
        ) {
          await tx.emailJob.update({
            where: { id: job.id },
            data: { status: "CANCELLED" },
          });
          return { skipped: true as const };
        }
        if (
          job.purpose === "REMINDER" &&
          (await tx.emailJob.findFirst({
            where: {
              userId: user.id,
              invitationVersion: user.invitationVersion,
              purpose: "INVITATION",
              sentAt: { gt: new Date(Date.now() - 86400000) },
            },
          }))
        ) {
          await tx.emailJob.update({
            where: { id: job.id },
            data: { status: "CANCELLED" },
          });
          return { skipped: true as const };
        }
        const token = randomBytes(32).toString("base64url");
        const attempt = await tx.emailSendAttempt.create({
          data: {
            jobId: job.id,
            email: user.email,
            invitationVersion: user.invitationVersion,
          },
        });
        await tx.accountActivationToken.create({
          data: {
            userId: user.id,
            tokenHash: tokenDigest(token),
            email: user.email,
            invitationVersion: user.invitationVersion,
            expiresAt: new Date(Date.now() + LINK_LIFETIME_MS),
            attemptId: attempt.id,
          },
        });
        await tx.emailJob.update({
          where: { id: job.id },
          data: {
            status: "PROCESSING",
            attemptCount: { increment: 1 },
            leaseOwner,
            leaseUntil: new Date(Date.now() + 120000),
          },
        });
        const member = await tx.programMembership.findFirst({
          where: { userId: user.id, kind: "STUDENT", isActive: true },
          include: { program: true },
        });
        return {
          skipped: false as const,
          job,
          user,
          token,
          attemptId: attempt.id,
          program: member?.program.code ?? "",
        };
      });
      if (!preparation) break;
      if (preparation.skipped) continue;
      const { job, user, token, attemptId, program } = preparation;
      const link = new URL("/activate", baseUrl);
      link.hash = "token=" + token;
      let outcome = "SENT",
        messageId: string | undefined,
        errorCode: string | undefined,
        pause = false,
        permanent = false;
      try {
        const info = await driver.send({
          to: user.email,
          ...activationEmail({
            name: user.name,
            studentNumber: user.studentNumber,
            program,
            instituteCode: user.institute.code,
            link: link.href,
            reminder: job.purpose === "REMINDER",
          }),
        });
        if (!info.success || info.deliveredVia !== "smtp")
          throw new MailDeliveryError("SMTP_NOT_ACCEPTED");
        messageId = info.messageId;
      } catch (error) {
        const detail =
          error instanceof MailDeliveryError
            ? error
            : new MailDeliveryError("SMTP_UNKNOWN");
        errorCode = detail.code;
        pause =
          ["EAUTH", "SMTP_QUOTA", "SMTP_NOT_CONFIGURED"].includes(
            detail.code,
          ) || [421, 454].includes(detail.responseCode ?? 0);
        permanent =
          !pause && Boolean(detail.responseCode && detail.responseCode >= 500);
        outcome = [
          "ETIMEDOUT",
          "ECONNECTION",
          "ESOCKET",
          "SMTP_UNKNOWN",
        ].includes(detail.code)
          ? "UNKNOWN"
          : "FAILED";
      }
      await db.$transaction(async (tx) => {
        await lockAccounts(tx, [user.id]);
        await tx.emailSendAttempt.update({
          where: { id: attemptId },
          data: { outcome, errorCode, messageId, completedAt: new Date() },
        });
        const current = await tx.user.findUnique({ where: { id: user.id } });
        const valid =
          current &&
          pendingStudent(current) &&
          current.email === user.email &&
          current.invitationVersion === job.invitationVersion;
        const accepted = outcome === "SENT";
        const retry =
          !accepted &&
          !permanent &&
          (outcome === "UNKNOWN" ||
            !errorCode ||
            !["RECIPIENT_REJECTED", "EENVELOPE"].includes(errorCode)) &&
          job.attemptCount < 4;
        const updated = await tx.emailJob.updateMany({
          where: { id: job.id, status: "PROCESSING", leaseOwner },
          data: {
            status: !valid
              ? "CANCELLED"
              : accepted
                ? "SENT"
                : retry
                  ? "QUEUED"
                  : "FAILED",
            sentAt: accepted ? new Date() : null,
            scheduledAt: new Date(
              Date.now() + (RETRY_DELAYS_MS[job.attemptCount] ?? 0),
            ),
            leaseOwner: null,
            leaseUntil: null,
          },
        });
        if (!valid || outcome === "FAILED")
          await tx.accountActivationToken.updateMany({
            where: { attemptId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        if (
          accepted &&
          valid &&
          updated.count &&
          job.purpose === "INVITATION"
        ) {
          const key = "reminder:" + user.id + ":" + job.invitationVersion;
          const reminder = await tx.emailJob.findUnique({
            where: { dedupeKey: key },
          });
          if (!reminder)
            await tx.emailJob.create({
              data: {
                userId: user.id,
                instituteId: user.instituteId,
                invitationVersion: job.invitationVersion,
                purpose: "REMINDER",
                parentJobId: job.id,
                requestedById: job.requestedById,
                dedupeKey: key,
                scheduledAt: new Date(Date.now() + REMINDER_DELAY_MS),
              },
            });
          else if (
            reminder.status === "CANCELLED" &&
            reminder.attemptCount === 0
          )
            await tx.emailJob.update({
              where: { id: reminder.id },
              data: { status: "QUEUED" },
            });
        }
        await audit(
          tx,
          job.requestedById ?? user.id,
          user.id,
          "INVITATION_" + outcome,
          {
            jobId: job.id,
            attemptId,
            purpose: job.purpose,
            invitationVersion: job.invitationVersion,
            triggeredBy: job.requestedById ? "ADMIN" : "ACCOUNT_REQUEST",
            stale: !valid,
            errorCode,
          },
        );
        await tx.emailSenderState.update({
          where: { id: SENDER },
          data: {
            nextSendAt: new Date(Date.now() + 1000),
            lastProcessedAt: new Date(),
            ...(pause
              ? {
                  pausedUntil: new Date(Date.now() + 86400000),
                  pauseReason: errorCode,
                }
              : {}),
          },
        });
      });
      processed++;
      if (pause) break;
    }
    await db.emailSenderState.update({
      where: { id: SENDER },
      data: { lastProcessedAt: new Date() },
    });
    return { processed };
  } finally {
    await db.emailSenderState.updateMany({
      where: { id: SENDER, leaseOwner },
      data: { leaseOwner: null, leaseUntil: null },
    });
  }
}
