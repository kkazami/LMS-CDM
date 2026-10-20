import { randomBytes } from "node:crypto";
import { AccessError } from "@/lib/super-user-v1/actor";
import { requireTerm, type Tx } from "./policy";
import { normalizeCode } from "./csv";

export async function courseOffering(
  tx: Tx,
  input: {
    instituteId: string;
    termId?: string | null;
    code: string;
    section?: string;
    excludeId?: string;
  },
) {
  await requireTerm(tx, input.instituteId, input.termId);
  const code = normalizeCode(input.code),
    section = normalizeCode(input.section ?? "");
  if (!section) throw new AccessError(400, "Section is required.");
  const duplicate = await tx.course.findFirst({
    where: {
      instituteId: input.instituteId,
      termId: input.termId,
      code: { equals: code, mode: "insensitive" },
      section: { equals: section, mode: "insensitive" },
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
    },
  });
  if (duplicate)
    throw new AccessError(
      409,
      "This course code and section already exist in the selected term.",
    );
  return { code, section, termId: input.termId! };
}
export async function joinCode(tx: Tx) {
  for (let n = 0; n < 10; n++) {
    const code = randomBytes(6).toString("hex").toUpperCase();
    if (
      !(await tx.course.findUnique({
        where: { courseCode: code },
        select: { id: true },
      }))
    )
      return code;
  }
  throw new AccessError(503, "Could not generate a join code. Retry.");
}
