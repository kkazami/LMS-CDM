"use server";
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { getSession } from '@/lib/auth-session';
import { administratorInstitute } from '@/lib/administrator-scope';
import { previewImport } from '@/lib/roster/imports';
import { executeSkill } from './index';
export async function bulkUserIngestion(input: { csvData: string; instituteCode: string; actorId: string }) {
  const user = await requireLegacyActor('bulkUserIngestion');
  return executeSkill('bulkUserIngestion', async () => {
    if (user.id !== input.actorId || user.role !== 'ADMIN') throw new Error('Administrator required.');
    await administratorInstitute(user, input.instituteCode);
    const session = await getSession();
    if (!session) throw new Error('Authentication required.');
    return previewImport({ id: user.id, sessionId: session.id, tokenHash: session.tokenHash, instituteId: user.instituteId }, { type: 'STUDENTS', csv: input.csvData });
  });
}
