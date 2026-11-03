import { attendanceActor, attendanceError, privateHeaders } from '@/lib/attendance/http';
import { attendanceAssignments } from '@/lib/attendance/read';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { return Response.json(await attendanceAssignments(await attendanceActor(request)), { headers: privateHeaders }); }
  catch (error) { return attendanceError(error); }
}
