import { NextResponse } from 'next/server';
import { databaseAdministrator, databaseTables, databaseCount } from '@/lib/admin-database';
import { accountErrorResponse } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await databaseAdministrator(request);
    const tables = await Promise.all(Object.keys(databaseTables).map(async model => ({
      name: model, model, description: 'Institute-scoped records', count: await databaseCount(model, actor.instituteId),
    })));
    return NextResponse.json({
      status: 'HEALTHY', database: { provider: 'PostgreSQL', driver: '@prisma/adapter-pg', connection: 'CONNECTED', lastChecked: new Date().toISOString() },
      metrics: { totalCategories: 1, totalTables: tables.length, totalRecords: tables.reduce((sum, table) => sum + table.count, 0) },
      categories: [{ id: 'institute', name: 'Institute database', description: 'Authorized institute records; secret and identity lifecycle data use dedicated tools.', color: '#3B82F6', tables }],
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return accountErrorResponse(error); }
}
