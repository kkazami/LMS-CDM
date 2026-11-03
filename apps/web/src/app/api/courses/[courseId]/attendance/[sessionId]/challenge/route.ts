import { attendanceActor, attendanceError, privateHeaders } from '@/lib/attendance/http';
import { attendanceChallenge } from '@/lib/attendance/read';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ courseId: string; sessionId: string }> }) {
  try { const actor = await attendanceActor(request); const { courseId, sessionId } = await context.params; return Response.json(await attendanceChallenge(actor, courseId, sessionId), { headers: privateHeaders }); }
  catch (error) { return attendanceError(error); }
}
