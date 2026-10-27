import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

async function ensureSupportTicketTable() {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SupportTicket" (
        "id" TEXT NOT NULL,
        "subject" TEXT NOT NULL DEFAULT '',
        "message" TEXT NOT NULL DEFAULT '',
        "category" TEXT NOT NULL DEFAULT 'GENERAL',
        "status" TEXT NOT NULL DEFAULT 'OPEN',
        "priority" TEXT NOT NULL DEFAULT 'NORMAL',
        "authorId" TEXT NOT NULL DEFAULT '',
        "instituteId" TEXT NOT NULL DEFAULT '',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolvedAt" TIMESTAMP(3),
        "adminReply" TEXT,
        "repliedAt" TIMESTAMP(3),
        CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
      );

      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "subject" TEXT NOT NULL DEFAULT '';
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "message" TEXT NOT NULL DEFAULT '';
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'GENERAL';
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'OPEN';
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "authorId" TEXT NOT NULL DEFAULT '';
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "instituteId" TEXT NOT NULL DEFAULT '';
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "adminReply" TEXT;
      ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS "repliedAt" TIMESTAMP(3);

      CREATE INDEX IF NOT EXISTS "SupportTicket_authorId_idx" ON "SupportTicket"("authorId");
      CREATE INDEX IF NOT EXISTS "SupportTicket_instituteId_idx" ON "SupportTicket"("instituteId");
      CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
    `);
  } catch (err) {
    console.warn("Notice: ensureSupportTicketTable warning:", err);
  }
}

function isTableOrColumnMissingError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes('does not exist') ||
    msg.includes('42P01') ||
    msg.includes('42703') ||
    msg.includes('column') ||
    msg.includes('relation "SupportTicket"') ||
    msg.includes('SupportTicket')
  );
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const { subject, message, category = 'GENERAL', priority = 'NORMAL' } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ message: 'Subject and message are required.' }, { status: 400 });
    }

    const instituteId = session.user.instituteId || session.user.institute?.id;
    if (!instituteId) {
      return NextResponse.json({ message: 'User institute association is missing.' }, { status: 400 });
    }

    const createTicket = () =>
      db.supportTicket.create({
        data: {
          subject,
          message,
          category,
          priority,
          status: 'OPEN',
          authorId: session.user.id,
          instituteId,
        },
      });

    type TicketResult = Awaited<ReturnType<typeof createTicket>>;
    let ticket: TicketResult;
    try {
      ticket = await createTicket();
    } catch (createErr) {
      if (isTableOrColumnMissingError(createErr)) {
        await ensureSupportTicketTable();
        ticket = await createTicket();
      } else {
        throw createErr;
      }
    }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('SUPPORT_TICKET_POST_ERROR', error);
    const msg = error instanceof Error ? error.message : 'Something went wrong while submitting support ticket.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const instituteId = session.user.instituteId || session.user.institute?.id;
    const isAdmin = session.user.role === 'ADMIN';

    const findTickets = () =>
      db.supportTicket.findMany({
        where: {
          ...(instituteId ? { instituteId } : {}),
          ...(isAdmin ? {} : { authorId: session.user.id }),
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

    type TicketsResult = Awaited<ReturnType<typeof findTickets>>;
    let tickets: TicketsResult = [];
    try {
      tickets = await findTickets();
    } catch (fetchErr) {
      if (isTableOrColumnMissingError(fetchErr)) {
        await ensureSupportTicketTable();
        tickets = [];
      } else {
        throw fetchErr;
      }
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('SUPPORT_TICKET_GET_ERROR', error);
    const msg = error instanceof Error ? error.message : 'Something went wrong while fetching support tickets.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
    }

    const { id, status, priority, adminReply } = await request.json();

    if (!id) {
      return NextResponse.json({ message: 'Ticket ID is required.' }, { status: 400 });
    }

    const dataToUpdate: {
      status?: string;
      resolvedAt?: Date | null;
      priority?: string;
      adminReply?: string;
      repliedAt?: Date;
    } = {};

    if (status) {
      dataToUpdate.status = status;
      if (status === 'RESOLVED' || status === 'CLOSED') {
        dataToUpdate.resolvedAt = new Date();
      } else {
        dataToUpdate.resolvedAt = null;
      }
    }
    if (priority) {
      dataToUpdate.priority = priority;
    }
    if (adminReply !== undefined) {
      dataToUpdate.adminReply = adminReply;
      dataToUpdate.repliedAt = new Date();
    }

    const instituteId = session.user.instituteId || session.user.institute?.id;

    const updateTicket = () =>
      db.supportTicket.update({
        where: {
          id,
          ...(instituteId ? { instituteId } : {}),
        },
        data: dataToUpdate,
      });

    type UpdatedTicketResult = Awaited<ReturnType<typeof updateTicket>>;
    let ticket: UpdatedTicketResult;
    try {
      ticket = await updateTicket();
    } catch (updateErr) {
      if (isTableOrColumnMissingError(updateErr)) {
        await ensureSupportTicketTable();
        ticket = await updateTicket();
      } else {
        throw updateErr;
      }
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('SUPPORT_TICKET_PATCH_ERROR', error);
    const msg = error instanceof Error ? error.message : 'Something went wrong while updating support ticket.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

