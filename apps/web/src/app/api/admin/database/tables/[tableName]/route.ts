import { NextResponse } from 'next/server';
import { databaseAdministrator, databaseRows } from '@/lib/admin-database';
import { accountErrorResponse } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ tableName: string }> }) {
  try {
    const actor = await databaseAdministrator(request);
    const { tableName } = await context.params;
    const { rows, totalCount } = await databaseRows(tableName, actor.instituteId, 25);
    return NextResponse.json({ model: tableName, totalCount, sampleCount: rows.length,
      columns: rows.length ? Object.keys(rows[0]) : ['id'], rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return accountErrorResponse(error); }
}
