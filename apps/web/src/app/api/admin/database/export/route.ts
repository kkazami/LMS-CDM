import { NextResponse } from 'next/server';
import { databaseAdministrator, databaseRows } from '@/lib/admin-database';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await databaseAdministrator(request);
    const model = new URL(request.url).searchParams.get('model');
    if (!model) throw new AccessError(400, 'Model is required.');
    const { rows } = await databaseRows(model, actor.instituteId, 500);
    return new NextResponse(JSON.stringify(rows, null, 2), { headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="${model.toLowerCase()}_export.json"`,
    } });
  } catch (error) { return accountErrorResponse(error); }
}
