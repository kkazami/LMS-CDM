import { db } from '@/lib/db';
import { fileResponse } from '@/lib/academic-structure/assets';
import { AccessError } from '@/lib/super-user-v1/actor';
import { requireSupportTicketUser, supportTicketError } from '@/lib/support-ticket-access';

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const user = await requireSupportTicketUser(request);
    const { ticketId } = await params;
    const file = await db.supportTicketAttachment.findFirst({
      where: {
        ticketId,
        ticket: {
          instituteId: user.instituteId,
          ...(user.isAdmin ? {} : { authorId: user.id }),
        },
      },
    });
    if (!file) throw new AccessError(404, 'Attachment not found.');
    return fileResponse({ bytes: Buffer.from(file.content), mime: file.mimeType, name: file.fileName });
  } catch (error) {
    return supportTicketError(error, 'Could not download the attachment.');
  }
}
