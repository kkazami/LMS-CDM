import { academicActor, academicError, academicTransaction, academicAudit } from '@/lib/academic-structure/policy';
import { oversightCourse } from '@/lib/academic-structure/programs';
import { storedFile, fileResponse, legacyReference } from '@/lib/academic-structure/assets';
import { AccessError } from '@/lib/super-user-v1/actor';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(r: Request, c: {
    params: Promise<{
        programId: string;
        courseId: string;
    }>;
}) {
    try {
        const actor = await academicActor(r), p = await c.params, q = new URL(r.url).searchParams;
        return await academicTransaction(actor, async (tx) => {
            const course = await oversightCourse(tx, actor, p.programId, p.courseId);
            const id = q.get('id') ?? '';
            let url: string, name: string, owner: string | null, type: string;
            if (q.get('kind') === 'content') {
                const a = await tx.attachment.findFirst({ where: { id, syllabusItem: { courseId: p.courseId } } });
                if (!a)
                    throw new AccessError(404, 'Attachment unavailable.');
                url = a.url;
                type = a.type;
                name = a.fileName;
                owner = course.instructorId;
            }
            else if (q.get('kind') === 'submission') {
                const a = await tx.submissionAttachment.findFirst({ where: { id, submission: { status: { in: ['SUBMITTED', 'RETURNED'] }, syllabusItem: { courseId: p.courseId }, student: { instituteId: actor.instituteId, isActive: true, role: { equals: 'STUDENT', mode: 'insensitive' }, enrollments: { some: { courseId: p.courseId, status: 'APPROVED' } } } } }, include: { submission: { select: { studentId: true } } } });
                if (!a)
                    throw new AccessError(404, 'Attachment unavailable.');
                url = a.url;
                type = a.type;
                name = a.fileName;
                owner = a.submission.studentId;
            }
            else
                throw new AccessError(400, 'Select an attachment kind.');
            await academicAudit(tx, actor, 'PROGRAM_ATTACHMENT_READ', { programId: p.programId, courseId: p.courseId });
            if (type === 'LINK' && url.startsWith('https://')) {
                const target = new URL(url);
                if (target.username || target.password)
                    throw new AccessError(400, 'Unsafe external link.');
                return new Response(null, { status: 302, headers: { Location: target.toString(), 'Cache-Control': 'private, no-store' } });
            }
            if(url.startsWith('/uploads/')&&!await legacyReference(tx,actor,url,q.get('kind')==='content'?'CONTENT':'SUBMISSION',id,p.courseId))throw new AccessError(404,'Legacy attachment reference is not approved.');
            const f = await storedFile(tx, url, owner ?? undefined);
            return fileResponse({ ...f, name: name || f.name });
        });
    }
    catch (e) {
        return academicError(e);
    }
}
