import path from 'node:path';
import { z } from 'zod';
import { db } from '@/lib/db';
import { limitAuthenticatedOperation } from '@/lib/authenticated-rate-limits';
import { boundedUploadBody, scanUpload, withUploadSlot } from '@/lib/private-upload';
import { boundedJson } from '@/lib/roster/policy';
import { AccessError } from '@/lib/super-user-v1/actor';
import { reportAreas, reportFileType, reportLimits } from '@/lib/support-report';
import { requireSupportTicketUser, supportTicketError } from '@/lib/support-ticket-access';

export const dynamic = 'force-dynamic';

const categories = z.enum(['GENERAL', 'TECHNICAL', 'ACCOUNT', 'COURSE', 'OTHER']);
const priorities = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);
const legacyTicket = z.object({
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(8000),
  category: categories.default('GENERAL'),
  priority: priorities.default('NORMAL'),
});
const report = z.object({
  subject: z.string().trim().min(1).max(reportLimits.title),
  area: z.enum(Object.keys(reportAreas) as (keyof typeof reportAreas)[]),
  description: z.string().trim().min(1).max(reportLimits.description),
  steps: z.string().trim().max(reportLimits.steps),
});

async function readReport(request: Request) {
  const form = await boundedUploadBody(request, reportLimits.attachment).catch(error => {
    if (error instanceof AccessError && error.status === 413) throw new AccessError(413, 'Choose a file up to 4 MB.');
    if (error instanceof AccessError) throw error;
    throw new AccessError(400, 'The report could not be read. Try again.');
  });
  const result = report.safeParse({
    subject: form.get('subject'),
    area: form.get('area'),
    description: form.get('description'),
    steps: form.get('steps') ?? '',
  });
  if (!result.success) throw new AccessError(400, 'Check the title, page, and description.');
  const { subject, area, description, steps } = result.data;
  const message = ['Page: ' + reportAreas[area], description, steps ? 'Steps to repeat:\n' + steps : ''].filter(Boolean).join('\n\n');
  const ticket = { subject, message, category: area === 'account' ? 'ACCOUNT' : 'TECHNICAL' };

  const files = form.getAll('attachment');
  if (files.length === 0) return ticket;
  const file = files[0];
  if (files.length !== 1 || !(file instanceof File)) throw new AccessError(400, 'Choose one screenshot or video.');
  if (!file.size || file.size > reportLimits.attachment) throw new AccessError(400, 'Choose a non-empty file up to 4 MB.');

  const fileName = path.basename(file.name.replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f]/g, '');
  const mimeType = reportFileType(fileName);
  if (!mimeType || fileName.length > 200) throw new AccessError(400, 'Choose a JPG, PNG, WebP, MP4, MOV, or WebM file with a shorter name.');

  const content = Buffer.from(await file.arrayBuffer());
  const { fileTypeFromBuffer } = await import('file-type');
  const detected = await fileTypeFromBuffer(content).catch(() => undefined);
  if (detected?.mime !== mimeType) throw new AccessError(400, 'The file contents do not match its file type.');

  await scanUpload(content);
  return { ...ticket, attachment: { create: { fileName, mimeType, content } } };
}

export async function POST(request: Request) {
  try {
    const { id: authorId, instituteId } = await requireSupportTicketUser(request);
    const create = (data: Awaited<ReturnType<typeof readReport>> | z.output<typeof legacyTicket>) =>
      db.supportTicket.create({ data: { ...data, authorId, instituteId } });
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      await limitAuthenticatedOperation('supportReport', authorId);
      const ticket = await withUploadSlot(async () => {
        const data = await readReport(request);
        return create(data).catch(error => {
          if ('attachment' in data && error?.code === 'P2021') {
            throw new AccessError(503, 'File attachments are unavailable. Remove the file to send your report.');
          }
          throw error;
        });
      });
      return Response.json({ ticket }, { status: 201 });
    }
    const result = legacyTicket.safeParse(await boundedJson(request, 64 * 1024));
    if (!result.success) throw new AccessError(400, 'Check the subject and message.');
    return Response.json({ ticket: await create(result.data) }, { status: 201 });
  } catch (error) {
    return supportTicketError(error, 'Could not send your report. Try again.');
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireSupportTicketUser(request);
    const mine = new URL(request.url).searchParams.get('mine') === '1';
    const query = {
      where: {
        instituteId: user.instituteId,
        ...(mine || !user.isAdmin ? { authorId: user.id } : {}),
      },
      orderBy: { createdAt: 'desc' as const },
    };
    const author = { select: { id: true, name: true, email: true, role: true } } as const;
    const tickets = await db.supportTicket.findMany({
      ...query,
      include: {
        author,
        attachment: { select: { fileName: true } },
      },
    }).catch(async error => {
      if (error?.code !== 'P2021') throw error;
      const withoutAttachments = await db.supportTicket.findMany({ ...query, include: { author } });
      return withoutAttachments.map(ticket => ({ ...ticket, attachment: null }));
    });
    return Response.json({ tickets });
  } catch (error) {
    return supportTicketError(error, 'Could not load support tickets.');
  }
}

const ticketUpdate = z.object({
  id: z.string().min(1).max(100),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: priorities.optional(),
  category: categories.optional(),
  adminReply: z.string().max(8000).nullable().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireSupportTicketUser(request);
    if (!user.isAdmin) throw new AccessError(403, 'Only administrators can update tickets.');

    const result = ticketUpdate.safeParse(await boundedJson(request, 64 * 1024));
    if (!result.success) throw new AccessError(400, 'Check the ticket details.');
    const { id, status, adminReply, ...changes } = result.data;
    const ticket = await db.supportTicket.update({
      where: { id, instituteId: user.instituteId },
      data: {
        ...changes,
        status,
        ...(status ? { resolvedAt: status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null } : {}),
        ...(adminReply !== undefined ? { adminReply, repliedAt: new Date() } : {}),
      },
    }).catch(error => {
      if (error?.code === 'P2025') throw new AccessError(404, 'Ticket not found.');
      throw error;
    });
    return Response.json({ ticket });
  } catch (error) {
    return supportTicketError(error, 'Could not update the ticket.');
  }
}
