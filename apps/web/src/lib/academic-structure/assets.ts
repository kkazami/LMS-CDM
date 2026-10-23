import { randomUUID } from 'node:crypto';
import { readFile, lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { AccessError } from '@/lib/super-user-v1/actor';
import { programAccess, academicAudit, type AcademicActor, type Tx } from './policy';
const assetPattern = /^\/api\/assets\/([a-zA-Z0-9-]{1,100})$/;
export async function canReadClassItem(tx: Tx, actor: AcademicActor, itemId: string, submissionStudentId?: string) {
    const i = await tx.syllabusItem.findUnique({ where: { id: itemId }, include: { course: true, targetGroups: { include: { group: { include: { members: { where: { studentId: actor.id }, select: { studentId: true } } } } } } } });
    if (!i || i.course.instituteId !== actor.instituteId || i.course.isArchived)
        return false;
    if (actor.role === 'INSTRUCTOR') {
        if (i.course.instructorId === actor.id)
            return true;
        if (!i.course.programId || actor.instituteCode !== 'ics')
            return false;
        try {
            await programAccess(tx, actor, i.course.programId, true);
            return true;
        }
        catch (e) {
            if (e instanceof AccessError)
                return false;
            throw e;
        }
    }
    if (submissionStudentId && submissionStudentId !== actor.id)
        return false;
    const enrolled = await tx.enrollment.findUnique({ where: { courseId_studentId: { courseId: i.courseId, studentId: actor.id } } });
    return enrolled?.status === 'APPROVED' && (!i.targetGroups.length || i.targetGroups.some(t => t.group.members.length > 0));
}
async function canReadCourse(tx:Tx,actor:AcademicActor,courseId:string){
 const c=await tx.course.findFirst({where:{id:courseId,instituteId:actor.instituteId,isArchived:false}});if(!c)return false;
 if(actor.role==='STUDENT')return (await tx.enrollment.findUnique({where:{courseId_studentId:{courseId,studentId:actor.id}}}))?.status==='APPROVED';
 if(c.instructorId===actor.id)return true;if(!c.programId||actor.instituteCode!=='ics')return false;
 try{await programAccess(tx,actor,c.programId,true);return true;}catch(error){if(error instanceof AccessError)return false;throw error;}
}
export async function legacyReference(tx:Tx,actor:AcademicActor,url:string,kind:string,sourceId:string,courseId?:string){
 return Boolean(await tx.legacyAssetBinding.findFirst({where:{kind,sourceId,url,instituteId:actor.instituteId,...(courseId?{courseId}:{})},select:{sourceId:true}}));
}
async function authorizedLegacyUrl(tx:Tx,actor:AcademicActor,url:string){
 const bindings=await tx.legacyAssetBinding.findMany({where:{url,instituteId:actor.instituteId},take:101});if(bindings.length>100)throw new AccessError(503,'Legacy file references need reconciliation.');
 for(const b of bindings){
  if(b.kind==='CONTENT'){const a=await tx.attachment.findUnique({where:{id:b.sourceId},include:{syllabusItem:{select:{courseId:true}}}});if(a?.url===url&&a.syllabusItem.courseId===b.courseId&&await canReadClassItem(tx,actor,a.syllabusItemId))return true;}
  if(b.kind==='SUBMISSION'){const a=await tx.submissionAttachment.findUnique({where:{id:b.sourceId},include:{submission:{include:{syllabusItem:{select:{courseId:true}}}}}});if(a?.url===url&&a.submission.syllabusItem.courseId===b.courseId&&(actor.role==='STUDENT'||['SUBMITTED','RETURNED'].includes(a.submission.status))&&await canReadClassItem(tx,actor,a.submission.syllabusItemId,a.submission.studentId))return true;}
  if(b.kind==='AVATAR'&&await tx.user.findFirst({where:{id:b.sourceId,instituteId:actor.instituteId,isActive:true,avatarUrl:url},select:{id:true}}))return true;
  if(b.kind==='COVER'){const c=await tx.course.findUnique({where:{id:b.sourceId},select:{coverImage:true}});if(c?.coverImage===url&&await canReadCourse(tx,actor,b.sourceId))return true;}
 }
 return false;
}
export async function authorizeStoredUrl(tx: Tx, actor: AcademicActor, url: string, assetOwnerId?: string) {
    if(url.startsWith('/uploads/'))return authorizedLegacyUrl(tx,actor,url);
    const covers=await tx.course.findMany({where:{coverImage:url,instituteId:actor.instituteId,isArchived:false},select:{id:true,instructorId:true},take:101});
    if(covers.length>100)throw new AccessError(503,'File references need reconciliation.');
    for(const c of covers)if((!assetOwnerId||c.instructorId===assetOwnerId)&&await canReadCourse(tx,actor,c.id))return true;
    const content = await tx.attachment.findMany({ where: { url, syllabusItem: { course: { instituteId: actor.instituteId } } }, select: { syllabusItemId: true, syllabusItem: { select: { course: { select: { instructorId: true } } } } }, take: 101 });
    const submitted = await tx.submissionAttachment.findMany({ where: { url, submission: { syllabusItem: { course: { instituteId: actor.instituteId } } } }, select: { submission: { select: { studentId: true, status: true, syllabusItemId: true } } }, take: 101 });
    if (content.length > 100 || submitted.length > 100)
        throw new AccessError(503, 'Attachment references require reconciliation.');
    for (const a of content)
        if ((!assetOwnerId || assetOwnerId === a.syllabusItem.course.instructorId) && await canReadClassItem(tx, actor, a.syllabusItemId))
            return true;
    for (const a of submitted)
        if ((actor.role === 'STUDENT' || ['SUBMITTED', 'RETURNED'].includes(a.submission.status)) && (!assetOwnerId || assetOwnerId === a.submission.studentId) && await canReadClassItem(tx, actor, a.submission.syllabusItemId, a.submission.studentId))
            return true;
    return false;
}
export async function storedFile(tx: Tx, url: string, expectedOwnerId?: string) {
    const id = assetPattern.exec(url)?.[1];
    if (id) {
        const a = await tx.privateAsset.findUnique({ where: { id } });
        if (!a || expectedOwnerId && a.ownerId !== expectedOwnerId)
            throw new AccessError(404, 'Attachment unavailable.');
        return { bytes: Buffer.from(a.content), mime: a.mimeType, name: a.fileName };
    }
    const inline = /^data:([a-z0-9.+\/-]+);base64,([A-Za-z0-9+/=]+)$/.exec(url);
    if (inline) {
        const bytes = Buffer.from(inline[2], 'base64');
        if (bytes.length > 25 * 1024 * 1024)
            throw new AccessError(413, 'Attachment too large.');
        return { bytes, mime: inline[1], name: 'attachment' };
    }
    if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(url)) {
        const root = path.resolve(process.cwd(), 'public/uploads'), file = path.resolve(root, path.basename(url));
        try {
            if ((await lstat(root)).isSymbolicLink() || (await lstat(file)).isSymbolicLink() || path.dirname(await realpath(file)) !== await realpath(root))
                throw new AccessError(404, 'Attachment unavailable.');
            const stat = await lstat(file);
            if (!stat.isFile() || stat.size > 25 * 1024 * 1024)
                throw new AccessError(404, 'Attachment unavailable.');
            const bytes = await readFile(file);
            const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png' : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? 'image/jpeg' : bytes.subarray(0, 6).toString().startsWith('GIF8') ? 'image/gif' : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : 'application/octet-stream';
            return { bytes, mime, name: path.basename(file) };
        }
        catch (e) {
            if (e instanceof AccessError)
                throw e;
            throw new AccessError(404, 'Attachment unavailable.');
        }
    }
    // Never fetch arbitrary attachment URLs or turn legacy public blobs into a proxy.
    throw new AccessError(503, 'This legacy external attachment requires an authorized private-storage migration.');
}
import { SAFE_INLINE_MIME_TYPES, isSafeInlineMime, buildFileHeaders } from '@/lib/ite/media-preview';
export { SAFE_INLINE_MIME_TYPES, isSafeInlineMime };

export function fileResponse(file: {
    bytes: Buffer;
    mime: string;
    name: string;
}, inline = false) {
    const headers = buildFileHeaders(
        { mime: file.mime, name: file.name, length: file.bytes.length },
        inline
    );
    return new Response(new Uint8Array(file.bytes), { headers });
}
export const assetId = () => randomUUID();
