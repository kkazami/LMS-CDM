import { randomUUID, createHash } from 'node:crypto';
import { z } from 'zod';
import { AccessError } from '@/lib/super-user-v1/actor';
import { canonicalRole, mayAdmitAccount } from '@/lib/super-user-v1/capabilities';
import { academicTransaction, programAccess, academicAudit, type AcademicActor, type Tx } from './policy';
import { googleMeetLinks } from './meeting-links';
const chartInput = z.discriminatedUnion('operation', [
    z.object({ operation: z.literal('CREATE'), version: z.number().int().positive(), parentId: z.string().min(1), kind: z.enum(['GROUP', 'INSTRUCTOR']), label: z.string().trim().min(1).max(120), memberUserId: z.string().nullable(), position: z.number().int().min(0).max(10000) }).strict(),
    z.object({ operation: z.literal('UPDATE'), version: z.number().int().positive(), id: z.string().min(1), parentId: z.string().min(1), label: z.string().trim().min(1).max(120), position: z.number().int().min(0).max(10000) }).strict(),
    z.object({ operation: z.literal('DELETE'), version: z.number().int().positive(), id: z.string().min(1), confirm: z.literal(true) }).strict(),
]);
function requireICSChart(actor: AcademicActor) {
    if (actor.instituteCode !== 'ics') throw new AccessError(403, 'Program charts and class oversight are available in ICS only.');
}
export async function organizationPrograms(actor: AcademicActor) {
    requireICSChart(actor);
    if (actor.role !== 'INSTRUCTOR') throw new AccessError(403, 'Instructors only.');
    return academicTransaction(actor, async tx => {
        const memberships = await tx.programMembership.findMany({
            where: { userId: actor.id, instituteId: actor.instituteId, kind: 'INSTRUCTOR', isActive: true, program: { instituteId: actor.instituteId, isActive: true } },
            select: { program: { select: { id: true, name: true, code: true } }, headAssignment: { select: { isActive: true, revokedAt: true } } },
            orderBy: [{ program: { code: 'asc' } }, { programId: 'asc' }],
        });
        return memberships.map(m => ({ ...m.program, isHead: m.headAssignment?.isActive === true && m.headAssignment.revokedAt === null }));
    });
}
export async function readChart(actor: AcademicActor, programId: string) {
    requireICSChart(actor);
    return academicTransaction(actor, async (tx) => {
        const { program, isHead } = await programAccess(tx, actor, programId);
        const members = await tx.programMembership.findMany({ where: { programId, isActive: true, kind: 'INSTRUCTOR' }, include: { user: { select: { id: true, name: true, instituteId: true, isActive: true, role: true, credentialProvisioningState: true } }, headAssignment: true }, orderBy: { userId: 'asc' } });
        const eligible = members.filter(m => canonicalRole(m.user.role) === 'INSTRUCTOR' && mayAdmitAccount(m.user));
        const counts = await tx.course.groupBy({ by: ['instructorId'], where: { programId, instituteId: actor.instituteId, isArchived: false, instructorId: { in: eligible.map(m => m.userId) } }, _count: { _all: true } });
        const raw = await tx.programChartNode.findMany({ where: { programId }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
        // Retain structural parents, but do not disclose inactive/unassigned member identities.
        const nodes = raw.map(n => n.kind === 'INSTRUCTOR' && !eligible.some(m => m.userId === n.memberUserId) ? { ...n, label: 'Placement unavailable', memberUserId: null } : n);
        await academicAudit(tx, actor, 'PROGRAM_CHART_VIEW', { programId });
        return { program: { id: program.id, name: program.name, code: program.code }, isHead, version: program.chartVersion, nodes, members: eligible.map(m => ({ id: m.userId, name: m.user.name, isHead: m.headAssignment?.isActive === true && m.headAssignment.revokedAt === null, classCount: counts.find(c => c.instructorId === m.userId)?._count._all ?? 0 })) };
    });
}
export async function changeChart(actor: AcademicActor, programId: string, body: unknown) {
    requireICSChart(actor);
    const parsed = chartInput.safeParse(body);
    if (!parsed.success)
        throw new AccessError(400, 'Check the chart fields.');
    const input = parsed.data;
    return academicTransaction(actor, async (tx) => {
        const { program } = await programAccess(tx, actor, programId, true, true);
        if (program.chartVersion !== input.version)
            throw new AccessError(409, 'The chart changed. Refresh before saving.');
        const nodes = await tx.programChartNode.findMany({ where: { programId } });
        const existing = input.operation === 'CREATE' ? null : nodes.find(n => n.id === input.id);
        if (input.operation !== 'CREATE' && !existing)
            throw new AccessError(404, 'Chart node not found.');
        if (existing?.kind === 'ROOT')
            throw new AccessError(403, 'The program root is protected.');
        if (input.operation === 'DELETE') {
            await tx.programChartNode.updateMany({ where: { programId, parentId: input.id }, data: { parentId: existing!.parentId } });
            await tx.programChartNode.delete({ where: { id: input.id } });
        }
        else {
            const parent = nodes.find(n => n.id === input.parentId);
            if (!parent)
                throw new AccessError(400, 'Choose a parent in this program.');
            if (input.operation === 'CREATE') {
                if (nodes.length >= 300)
                    throw new AccessError(400, 'This chart has reached its 300-node limit.');
                if (input.kind === 'INSTRUCTOR') {
                    const member = await tx.programMembership.findUnique({ where: { programId_userId: { programId, userId: input.memberUserId ?? '' } }, include: { user: true } });
                    if (!member?.isActive || member.kind !== 'INSTRUCTOR' || canonicalRole(member.user.role) !== 'INSTRUCTOR' || !mayAdmitAccount(member.user))
                        throw new AccessError(400, 'Choose an active instructor assigned to this program.');
                    if (nodes.some(n => n.memberUserId === input.memberUserId))
                        throw new AccessError(409, 'This instructor is already placed.');
                }
                else if (input.memberUserId)
                    throw new AccessError(400, 'A group cannot assign an instructor.');
            }
            const candidate = input.operation === 'CREATE' ? { id: randomUUID(), programId, parentId: input.parentId, kind: input.kind, label: input.label, memberUserId: input.memberUserId, position: input.position } : { ...existing!, parentId: input.parentId, label: input.label, position: input.position };
            const revised = nodes.filter(n => n.id !== candidate.id).concat(candidate);
            for (const n of revised) {
                let current: typeof n | undefined = n;
                const visited = new Set<string>();
                while (current) {
                    if (visited.has(current.id) || visited.size > 12)
                        throw new AccessError(400, 'Keep a cycle-free chart with at most 12 levels.');
                    visited.add(current.id);
                    current = revised.find(p => p.id === current!.parentId);
                }
            }
            if (input.operation === 'CREATE')
                await tx.programChartNode.create({ data: candidate });
            else
                await tx.programChartNode.update({ where: { id: input.id }, data: { parentId: input.parentId, label: input.label, position: input.position } });
        }
        await tx.academicProgram.update({ where: { id: programId }, data: { chartVersion: { increment: 1 } } });
        await academicAudit(tx, actor, `PROGRAM_CHART_${input.operation}`, { programId, version: program.chartVersion + 1 });
        return { version: program.chartVersion + 1 };
    });
}
export async function oversightCourse(tx: Tx, actor: AcademicActor, programId: string, courseId: string) {
    requireICSChart(actor);
    await programAccess(tx, actor, programId, true, true);
    const c = await tx.course.findFirst({ where: { id: courseId, programId, instituteId: actor.instituteId, isArchived: false }, select: { id: true, title: true, code: true, section: true, room: true, instructorId: true, description: true, instructor: { select: { name: true, instituteId: true, isActive: true, role: true, credentialProvisioningState: true } } } });
    if (!c || !c.instructor || c.instructor.instituteId !== actor.instituteId || !mayAdmitAccount(c.instructor) || canonicalRole(c.instructor.role) !== 'INSTRUCTOR')
        throw new AccessError(404, 'Class not found.');
    return c;
}
export async function programInstructorClasses(actor: AcademicActor, programId: string, instructorId: string) {
    requireICSChart(actor);
    return academicTransaction(actor, async (tx) => {
        await programAccess(tx, actor, programId, true);
        const member = await tx.programMembership.findUnique({ where: { programId_userId: { programId, userId: instructorId } }, include: { user: true } });
        if (!member?.isActive || member.kind !== 'INSTRUCTOR' || !mayAdmitAccount(member.user) || canonicalRole(member.user.role) !== 'INSTRUCTOR')
            throw new AccessError(404, 'Instructor not found.');
        const courses = await tx.course.findMany({ where: { programId, instructorId, instituteId: actor.instituteId, isArchived: false }, select: { id: true, title: true, code: true, section: true, room: true, description: true }, orderBy: [{ title: 'asc' }, { id: 'asc' }] });
        await academicAudit(tx, actor, 'PROGRAM_CLASSES_VIEW', { programId });
        return { instructor: { id: instructorId, name: member.user.name }, courses };
    });
}
export async function readOversight(actor: AcademicActor, programId: string, courseId: string) {
    return academicTransaction(actor, async (tx) => {
        const c = await oversightCourse(tx, actor, programId, courseId);
        const roster = await tx.enrollment.findMany({ where: { courseId, status: 'APPROVED', student: { instituteId: actor.instituteId, isActive: true, role: { equals: 'STUDENT', mode: 'insensitive' } } }, select: { student: { select: { id: true, name: true } } }, orderBy: { studentId: 'asc' } });
        const announcements = await tx.announcement.findMany({ where: { courseId, author: { instituteId: actor.instituteId } }, select: { id: true, content: true, createdAt: true, author: { select: { id: true, name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
        const content = await tx.syllabusItem.findMany({ where: { courseId }, select: { id: true, title: true, description: true, type: true, dueDate: true, maxPoints: true, attachments: { select: { id: true, fileName: true, type: true } }, submissions: { where: { status: { in: ['SUBMITTED', 'RETURNED'] }, studentId: { in: roster.map(r => r.student.id) } }, select: { id: true, studentId: true, status: true, submittedAt: true, grade: true, isReturned: true, attachments: { select: { id: true, fileName: true, type: true } } } } }, orderBy: [{ orderIndex: 'asc' }, { id: 'asc' }] });
        await academicAudit(tx, actor, 'PROGRAM_COURSE_OVERSIGHT', { programId, courseId });
        const base = `/api/programs/${encodeURIComponent(programId)}/courses/${encodeURIComponent(courseId)}/attachments`;
        return { course: { id: c.id, title: c.title, code: c.code, section: c.section, room: c.room, description: c.description, instructor: c.instructor?.name ?? 'Instructor' }, roster: roster.map(r => r.student), stream: announcements.map(a => ({ id: a.id, content: a.content, createdAt: a.createdAt.toISOString(), author: a.author, meetingLinks: googleMeetLinks(a.content) })), content: content.map(i => ({ ...i, dueDate: i.dueDate?.toISOString() ?? null, attachments: i.attachments.map(a => ({ ...a, href: `${base}?kind=content&id=${encodeURIComponent(a.id)}` })), submissions: i.submissions.map(s => ({ ...s, submittedAt: s.submittedAt?.toISOString() ?? null, attachments: s.attachments.map(a => ({ ...a, href: `${base}?kind=submission&id=${encodeURIComponent(a.id)}` })) })) })) };
    });
}
