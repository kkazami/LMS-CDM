import { NextResponse } from 'next/server';
import { AccessError } from '@/lib/super-user-v1/actor';
import { exportGradebookSkill } from '@/lib/skills/gradebook-exporter';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  try {
    const denial = await denyLegacyApi(request, 'GET gradebook export');
    if (denial) return denial;
    const { courseId } = await params;
    const { csvContent, fileName } = await exportGradebookSkill(courseId, request);
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
