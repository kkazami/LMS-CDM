import { timingSafeEqual } from 'node:crypto';
import { purgeAttendance, retentionHealth } from '@/lib/attendance/retention';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET; const actual = request.headers.get('authorization');
  const valid = expected && expected.length >= 32 && actual && Buffer.byteLength(actual) === Buffer.byteLength(`Bearer ${expected}`) && timingSafeEqual(Buffer.from(actual), Buffer.from(`Bearer ${expected}`));
  if (!valid) return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  try {
    if (new URL(request.url).searchParams.get('health') === '1') { const health = await retentionHealth(); return Response.json(health, { status: health.healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }); }
    const result = await purgeAttendance(); return Response.json(result, { status: 'backlog' in result && result.backlog ? 503 : 200 });
  } catch { return Response.json({ message: 'Attendance retention job failed.' }, { status: 503 }); }
}
