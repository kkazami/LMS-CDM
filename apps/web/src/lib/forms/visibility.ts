import type { Prisma } from '@prisma/client';
import { labsAvailable } from '@/lib/labs/readiness';
import { visibleForms } from './availability';

export async function visibleSyllabusForms(now = new Date(), studentId?: string): Promise<Prisma.SyllabusItemWhereInput> {
  return { AND: [
    { OR: [{ form: null }, { form: visibleForms(now) }] },
    ...(await labsAvailable() ? [{ OR: [{ labAssignment: null }, { labAssignment: { publishedAt: { not: null }, archivedAt: null, course: { institute: { code: 'ics' } }, OR: [{ opensAt: null }, { opensAt: { lte: now } }] } }] }] : []),
    ...(studentId ? [{ OR: [{ targetGroups: { none: {} } }, { targetGroups: { some: { group: { members: { some: { studentId } } } } } }] }] : []),
  ] };
}
