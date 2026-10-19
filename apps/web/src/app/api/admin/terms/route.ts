import { z } from "zod";
import { db } from "@/lib/db";
import { AccessError } from "@/lib/super-user-v1/actor";
import {
  rosterActor,
  adminTransaction,
  rosterError,
  audit,
  boundedJson,
} from "@/lib/roster/policy";
import { normalizeCode } from "@/lib/roster/csv";
export const dynamic = "force-dynamic";
const input = z
  .object({
    id: z.string().optional(),
    code: z.string().trim().min(1).max(64).transform(normalizeCode),
    name: z.string().trim().min(1).max(120),
    isActive: z.boolean().default(true),
    isCurrent: z.boolean().default(false),
  })
  .strict();
export async function GET(request: Request) {
  try {
    const actor = await rosterActor(request);
    const [terms, programs] = await Promise.all([
      db.academicTerm.findMany({
        where: { instituteId: actor.instituteId },
        orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
      }),
      db.academicProgram.findMany({
        where: { instituteId: actor.instituteId, isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
    ]);
    return Response.json(
      { terms, programs },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return rosterError(error);
  }
}
async function save(request: Request) {
  try {
    const actor = await rosterActor(request, { requireStudentIds: false }),
      parsed = input.safeParse(await boundedJson(request, 8192));
    if (!parsed.success)
      throw new AccessError(400, "Provide a term code and name.");
    const { id, ...data } = parsed.data;
    const term = await adminTransaction(actor, async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Institute" WHERE id=${actor.instituteId} FOR UPDATE`;
      if (
        id &&
        !(await tx.academicTerm.findFirst({
          where: { id, instituteId: actor.instituteId },
        }))
      )
        throw new AccessError(404, "Term not found.");
      if (data.isCurrent && !data.isActive)
        throw new AccessError(400, "The current term must be active.");
      if (data.isCurrent)
        await tx.academicTerm.updateMany({
          where: { instituteId: actor.instituteId, isCurrent: true },
          data: { isCurrent: false },
        });
      const result = id
        ? await tx.academicTerm.update({ where: { id }, data })
        : await tx.academicTerm.create({
            data: { ...data, instituteId: actor.instituteId },
          });
      await audit(tx, actor.id, actor.id, "ACADEMIC_TERM_SAVED", {
        termId: result.id,
        ...data,
      });
      return result;
    }, { requireStudentIds: false });
    return Response.json({ term });
  } catch (error) {
    return rosterError(error);
  }
}
export const POST = save;
export const PATCH = save;
