import { attendanceActor, attendanceBody, attendanceError, privateHeaders } from '@/lib/attendance/http';
import { getAttendance } from '@/lib/attendance/read';
import { mutateAttendance } from '@/lib/attendance/mutate';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ courseId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const actor = await attendanceActor(request); const { courseId } = await context.params;
    const raw = new URL(request.url).searchParams.get('page') ?? '1';
    if (!/^[1-9]\d{0,4}$/.test(raw)) return Response.json({ message: 'Invalid page.' }, { status: 400, headers: privateHeaders });
    return Response.json(await getAttendance(actor, courseId, Number(raw)), { headers: privateHeaders });
  } catch (error) { return attendanceError(error); }
}
export async function POST(request: Request, context: Context) {
  try { const actor = await attendanceActor(request); const { courseId } = await context.params; return Response.json(await mutateAttendance(actor, courseId, await attendanceBody(request)), { headers: privateHeaders }); }
  catch (error) { return attendanceError(error); }
}
