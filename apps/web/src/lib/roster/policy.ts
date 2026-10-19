import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  AccessError,
  requireActor,
  revalidateActor,
  type Actor,
} from "@/lib/super-user-v1/actor";
import { administratorInstitute } from "@/lib/administrator-scope";

export type Tx = Prisma.TransactionClient;
export async function requireRosterConstraints(tx: Tx = db) {
  const [state] = await tx.$queryRaw<Array<{ ready: boolean }>>`
    SELECT count(*)=2 AS ready FROM pg_catalog.pg_index
    WHERE indexrelid IN (to_regclass('public."User_studentNumber_key"'), to_regclass('public."User_studentNumber_normalized_key"'))
      AND indisunique AND indisvalid`;
  if (!state?.ready) throw new AccessError(503,
    "Student imports are not ready yet. Ask the system administrator to check the student ID records and finish setup.");
}
export async function rosterActor(request: Request, options: { requireStudentIds?: boolean } = {}) {
  const actor = await requireActor(request, ["ADMIN"]);
  const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
  await administratorInstitute(user);
  // Viewing existing records does not require the student-import indexes.
  if (options.requireStudentIds !== false && !["GET", "HEAD"].includes(request.method)) await requireRosterConstraints();
  return { ...actor, instituteId: user.instituteId };
}
export type RosterActor = Awaited<ReturnType<typeof rosterActor>>;
export async function adminTransaction<T>(
  actor: RosterActor,
  work: (tx: Tx) => Promise<T>,
  options: { requireStudentIds?: boolean } = {},
) {
  return db.$transaction(
    async (tx) => {
      const current = await revalidateActor(tx, actor, ["ADMIN"]);
      if (current.instituteId !== actor.instituteId)
        throw new AccessError(
          403,
          "Your institute access changed. Refresh this page.",
        );
      if (options.requireStudentIds !== false) await requireRosterConstraints(tx);
      return work(tx);
    },
    { timeout: 20000 },
  );
}
export async function audit(
  tx: Tx,
  actorId: string,
  targetId: string,
  action: string,
  metadata: Record<string, unknown>,
) {
  await tx.auditLog.create({
    data: {
      adminId: actorId,
      targetId,
      action,
      metadata: JSON.stringify(metadata),
    },
  });
}
export function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export async function setStudentProgram(
  tx: Tx,
  actor: Actor,
  userId: string,
  programId: string,
) {
  await tx.$executeRaw`SELECT super_user_security.set_student_program(${actor.sessionId}, ${actor.tokenHash}, ${userId}, ${programId})`;
}
export async function requireTerm(
  tx: Tx,
  instituteId: string,
  termId: string | null | undefined,
) {
  if (
    !termId ||
    !(await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM "AcademicTerm" WHERE id=${termId} AND "instituteId"=${instituteId} AND "isActive" FOR SHARE`).length
  )
    throw new AccessError(
      400,
      "Choose an active academic term in your institute.",
    );
}
export function rosterError(error: unknown) {
  if (!(error instanceof AccessError) && !(error instanceof SyntaxError)) {
    const detail = error && typeof error === 'object' ? error as { code?: string } : {};
    console.warn('ROSTER_OPERATION_UNAVAILABLE', typeof detail.code === 'string' && /^P\d{4}$/.test(detail.code) ? detail.code : 'UNCLASSIFIED');
  }
  const conflict = (error as { code?: string } | null)?.code === "P2002";
  const status =
    error instanceof AccessError
      ? error.status
      : error instanceof SyntaxError
        ? 400
        : conflict
          ? 409
          : 503;
  return Response.json(
    {
      message:
        error instanceof AccessError
          ? error.message
          : status === 400
            ? "Invalid request."
            : conflict
              ? "An identifier is already in use. Refresh and correct the conflicting value."
              : "The operation could not be completed. Refresh and retry.",
    },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function boundedJson(
  request: Request,
  maxBytes = 6 * 1024 * 1024,
): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes)
    throw new AccessError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "Request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new AccessError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
