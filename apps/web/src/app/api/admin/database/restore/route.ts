import { NextResponse } from 'next/server';
import { z } from 'zod';
import { restoreDatabaseRows, databaseAdministrator } from '@/lib/admin-database';
import { boundedJson } from '@/lib/roster/policy';
import { accountErrorResponse } from '@/lib/super-user-v1/actor';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    await databaseAdministrator(request);
    const body = z.object({ model: z.string().min(1).max(100), records: z.array(z.unknown()).min(1).max(500) }).strict().parse(await boundedJson(request, 1024 * 1024));
    const restoredCount = await restoreDatabaseRows(request, body.model, body.records);
    return NextResponse.json({ success: true, model: body.model, restoredCount, message: 'Authorized existing records restored.' });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ message: 'Restore accepts existing record IDs and allowed profile/descriptive fields only.' }, { status: 400 });
    return accountErrorResponse(error);
  }
}
