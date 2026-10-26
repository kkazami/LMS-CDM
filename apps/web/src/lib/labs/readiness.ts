import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { AccessError } from '@/lib/super-user-v1/actor';
import { z } from 'zod';

export type LabSchemaState = 'ready' | 'legacy' | 'incomplete';
export const LAB_SETUP_MESSAGE = 'Guided practical labs require a database upgrade. Existing Classwork is still available. Ask the database administrator to apply the guided practical labs migration.';
let cached: { state: LabSchemaState; expires: number } | undefined;

const attemptProjection = z.object({ attempts: z.array(z.object({
  status: z.enum(['IN_PROGRESS', 'SUBMITTED', 'NEEDS_REVISION', 'GRADED']),
  revisionDueAt: z.date().nullable(),
})) });

/** A conditional Prisma relation selection may be absent on a legacy database. */
export function currentLabAttempt(assignment: unknown) {
  if (!assignment) return undefined;
  const parsed = attemptProjection.parse(assignment);
  return parsed.attempts[0];
}

/** Probe catalog metadata, never missing relations inside an academic transaction. */
export async function labSchemaState(client: Pick<Prisma.TransactionClient, '$queryRaw'> = db): Promise<LabSchemaState> {
  if (cached && cached.expires > Date.now()) return cached.state;
  const [row] = await client.$queryRaw<{ tables: number; columns: number }[]>`
    SELECT
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public'
        AND table_name IN ('LabTemplate', 'LabTemplateVersion', 'LabStep', 'LabAssignment', 'LabAttempt',
          'LabStepResponse', 'LabSubmission', 'LabEvidence', 'LabSubmissionEvidence', 'LabReview')) AS tables,
      (SELECT count(*)::int FROM information_schema.columns WHERE table_schema = 'public'
        AND table_name IN ('SyllabusItem', 'StudentSubmission') AND column_name = 'workHistoryState') AS columns
  `;
  if (!row) throw new Error('Unable to inspect guided lab schema.');
  const state = row.tables === 10 && row.columns === 2 ? 'ready'
    : row.tables === 0 && row.columns === 0 ? 'legacy' : 'incomplete';
  // Never cache absence: another worker may enable labs immediately after migration.
  cached = state === 'ready' ? { state, expires: Date.now() + 5000 } : undefined;
  return state;
}

/** Partial upgrades fail closed: do not hide lab relationships or bypass lab guards. */
export async function labsAvailable(client: Pick<Prisma.TransactionClient, '$queryRaw'> = db): Promise<boolean> {
  const state = await labSchemaState(client);
  if (state === 'incomplete') throw new AccessError(503, LAB_SETUP_MESSAGE);
  return state === 'ready';
}

export async function requireLabSchema(client: Pick<Prisma.TransactionClient, '$queryRaw'> = db): Promise<void> {
  if (!await labsAvailable(client)) throw new AccessError(503, LAB_SETUP_MESSAGE);
}

export async function academicProvenance(state: 'UNTOUCHED' | 'STARTED', client: Pick<Prisma.TransactionClient, '$queryRaw'> = db) {
  return await labsAvailable(client) ? { workHistoryState: state } : {};
}
