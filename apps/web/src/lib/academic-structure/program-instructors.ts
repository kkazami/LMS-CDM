import { db } from '@/lib/db';
import { z } from 'zod';
import { AccessError } from '@/lib/super-user-v1/actor';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { academicTransaction, revalidateAcademicActor, programAccess, type AcademicActor } from './policy';

function requireICS(actor: AcademicActor) {
    if (actor.instituteCode !== 'ics') throw new AccessError(403, 'Program faculty is available in ICS only.');
}

export async function availableProgramInstructors(actor: AcademicActor, programId: string, query: string) {
    requireICS(actor);
    if (query.length > 100) throw new AccessError(400, 'Keep the search under 100 characters.');
    return academicTransaction(actor, async tx => {
        await programAccess(tx, actor, programId, true);
        const instructors = await tx.user.findMany({
            where: {
                instituteId: actor.instituteId, isActive: true,
                name: { contains: query.trim(), mode: 'insensitive' },
                AND: [
                    { OR: ['PROFESSOR', 'TEACHER', 'INSTRUCTOR'].map(role => ({ role: { equals: role, mode: 'insensitive' as const } })) },
                    { OR: [{ credentialProvisioningState: null }, { credentialProvisioningState: 'COMPLETE' }] },
                ],
                programMemberships: { none: { programId, OR: [{ isActive: true }, { headAssignment: { isActive: true, revokedAt: null } }] } },
            },
            select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 51,
        });
        return { instructors: instructors.slice(0, 50), hasMore: instructors.length > 50 };
    });
}

const input = z.object({ instructorId: z.string().min(1).max(200), version: z.number().int().positive() }).strict();
export async function addProgramInstructor(actor: AcademicActor, programId: string, body: unknown) {
    requireICS(actor);
    const parsed = input.safeParse(body);
    if (!parsed.success) throw new AccessError(400, 'Choose an instructor and refresh the program before saving.');
    try {
        return await db.$transaction(async tx => {
            await lockAccounts(tx, [actor.id, parsed.data.instructorId]);
            await revalidateAcademicActor(tx, actor);
            await programAccess(tx, actor, programId, true);
            const rows = await tx.$queryRaw<{ version: number }[]>`SELECT super_user_security.add_program_instructor(${actor.sessionId}, ${actor.tokenHash}, ${programId}, ${parsed.data.instructorId}, ${parsed.data.version}::integer) AS version`;
            return { version: rows[0].version };
        }, { timeout: 10000, maxWait: 5000 });
    } catch (error) {
        const meta = (error as { meta?: { code?: string; driverAdapterError?: { cause?: { originalCode?: string } } } }).meta;
        const code = meta?.driverAdapterError?.cause?.originalCode ?? meta?.code;
        if (code === '42501') throw new AccessError(403, 'A current Program Head can add active instructors from their own institute only.');
        if (code === 'P0002') throw new AccessError(404, 'Program or instructor not found.');
        if (code === '40001') throw new AccessError(409, 'The program changed. Refresh the chart before saving.');
        if (code === '23505') throw new AccessError(409, 'This instructor is already assigned, or their designation needs administrator review.');
        throw error;
    }
}
