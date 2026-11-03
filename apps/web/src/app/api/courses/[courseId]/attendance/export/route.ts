import { attendanceActor, attendanceError, privateHeaders } from '@/lib/attendance/http';
import { attendanceExport } from '@/lib/attendance/read';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ courseId: string }> }) {
  try {
    const actor = await attendanceActor(request); const { courseId } = await context.params; const query = new URL(request.url).searchParams;
    const result = await attendanceExport(actor, courseId, query.get('from') ?? undefined, query.get('to') ?? undefined);
    return new Response(result.csv, { headers: { ...privateHeaders, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="attendance.csv"', 'X-Attendance-As-Of': result.asOf } });
  } catch (error) { return attendanceError(error); }
}
