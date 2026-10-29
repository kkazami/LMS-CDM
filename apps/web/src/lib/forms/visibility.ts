import type { Prisma } from '@prisma/client';
import { labsAvailable } from '@/lib/labs/readiness';
import { visibleForms } from './availability';

export async function visibleSyllabusForms(now = new Date(), studentId?: string, options: { scheduledLabMetadata?: boolean; scheduledFormMetadata?: boolean } = {}): Promise<Prisma.SyllabusItemWhereInput> {
  return { AND: [
    { OR: [{ form: null }, { form: visibleForms(now) }, ...(options.scheduledFormMetadata ? [{ form: { status: 'PUBLISHED', opensAt: { gt: now } } }] : [])] },
    // Only the web Classwork listing opts into scheduled metadata. Content and task APIs keep the start-date gate.
    ...(await labsAvailable() ? [{ OR: [{ labAssignment: null }, { labAssignment: { publishedAt: { not: null }, archivedAt: null, course: { institute: { code: 'ics' } }, ...(options.scheduledLabMetadata ? {} : { OR: [{ opensAt: null }, { opensAt: { lte: now } }] }) } }] }] : []),
    ...(studentId ? [{ OR: [{ targetGroups: { none: {} } }, { targetGroups: { some: { group: { members: { some: { studentId } } } } } }] }] : []),
  ] };
}
