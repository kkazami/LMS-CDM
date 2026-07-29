/**
 * Admin Audit Logs API — Paginated Immutable Ledger
 *
 * GET /api/admin/audit-logs — Read-only paginated audit log listing
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/rbac';
import type { AuditLogEntry, PaginatedResponse } from '@/lib/admin-types';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)));
    const actionFilter = searchParams.get('action') ?? '';
    const adminFilter = searchParams.get('adminId') ?? '';
    const targetFilter = searchParams.get('targetId') ?? '';

    const where: Record<string, unknown> = {};

    if (actionFilter) {
      where.action = { contains: actionFilter };
    }
    if (adminFilter) {
      where.adminId = adminFilter;
    }
    if (targetFilter) {
      where.targetId = targetFilter;
    }

    const [total, logs] = await db.$transaction([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: {
          admin: { select: { name: true, email: true } },
          target: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const data: AuditLogEntry[] = logs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      adminName: log.admin.name,
      targetId: log.targetId,
      targetName: log.target.name,
      action: log.action,
      ipAddress: log.ipAddress,
      metadata: (() => {
        try {
          return JSON.parse(log.metadata);
        } catch {
          return {};
        }
      })(),
      createdAt: log.createdAt.toISOString(),
    }));

    const response: PaginatedResponse<AuditLogEntry> = {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };

    return NextResponse.json(response);
  } catch (err) {
    const error = err as { status?: number; message?: string };
    return NextResponse.json(
      { message: error.message ?? 'Internal server error.' },
      { status: error.status ?? 500 }
    );
  }
}
