import AttendancePanel from '@/components/attendance/AttendancePanel';
import { getSession } from '@/lib/auth-session';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
export default async function AttendancePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params; const session = await getSession();
  return <AttendancePanel courseId={courseId} admin={canonicalRole(session?.user.role) === 'ADMIN'} />;
}
