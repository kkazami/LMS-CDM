import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

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

    const ticket = await db.supportTicket.create({
      data: {
        subject,
        message,
        category,
        priority,
        status: 'OPEN',
        authorId: session.user.id,
        instituteId: session.user.instituteId,
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('SUPPORT_TICKET_POST_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ message: 'Not authenticated.' }, { status: 401 });
    }

    const instituteId = session.user.instituteId;

    // Students/Instructors can only see their own tickets. Admins see all tickets for the institute.
    const isAdmin = session.user.role === 'ADMIN';

    const tickets = await db.supportTicket.findMany({
      where: {
        instituteId,
        ...(isAdmin ? {} : { authorId: session.user.id }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('SUPPORT_TICKET_GET_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
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

    const dataToUpdate: any = {};
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

    const ticket = await db.supportTicket.update({
      where: { id, instituteId: session.user.instituteId },
      data: dataToUpdate,
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('SUPPORT_TICKET_PATCH_ERROR', error);
    return NextResponse.json({ message: 'Something went wrong.' }, { status: 500 });
  }
}
