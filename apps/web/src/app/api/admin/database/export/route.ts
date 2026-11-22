import { NextResponse } from 'next/server';
import { databaseAdministrator, databaseRows } from '@/lib/admin-database';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await databaseAdministrator(request);
    const model = new URL(request.url).searchParams.get('model');
    if (!model) throw new AccessError(400, 'Model is required.');
    const { rows } = await databaseRows(model, actor.instituteId, 500);
    const body = JSON.stringify(rows, null, 2);
    // Record preparation before releasing data; never include rows or request metadata.
    await db.auditLog.create({ data: {
      adminId: actor.id, targetId: actor.id, action: 'DATABASE_TABLE_EXPORTED',
      metadata: JSON.stringify({ instituteId: actor.instituteId, model, recordsExported: rows.length, limit: 500, format: 'json', outcome: 'PREPARED' }),
    } });
    return new NextResponse(body, { headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${model.toLowerCase()}_export.json"`,
    } });
  } catch (error) { return accountErrorResponse(error); }
}
