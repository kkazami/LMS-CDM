import { getSession } from '@/lib/auth-session';
import { db } from '@/lib/db';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import { access } from '@/lib/attendance/access';
import { transaction } from '@/lib/attendance/read';
import { redirect, notFound } from 'next/navigation';
import { AccessError } from '@/lib/super-user-v1/actor';
import CourseHeader from '@/components/courses/CourseHeader';
import CourseTabs from '@/components/courses/CourseTabs';

export default async function AttendanceLayout({ children, params }: { children: React.ReactNode; params: Promise<{ institute: string; courseId: string }> }) {
  const { institute, courseId } = await params; const session = await getSession();
  if (!session) redirect(`/login?institute=${institute}`);
  const context = await transaction(tx => access(tx, { id: session.user.id, sessionId: session.id }, courseId)).catch(error => { if (error instanceof AccessError) notFound(); throw error; });
  if (context.course.institute.code.toLowerCase() !== institute.toLowerCase()) notFound();
  const course = await db.course.findUniqueOrThrow({ where: { id: courseId }, include: { instructor: { select: { name: true } } } });
  const theme = getInstituteTheme(institute);
  return <div className="-m-4 lg:-m-8"><div className="px-4 pt-4 md:px-8 md:pt-6"><CourseHeader course={course} theme={theme} isInstructor={context.role === 'MANAGER'} instituteCode={institute} courseId={courseId} /></div><div className="mt-4"><CourseTabs courseId={courseId} instituteCode={institute} theme={theme} isInstructor={context.role === 'MANAGER'} attendanceOnly={context.role === 'HELPER'} /></div><div className="px-4 py-6 md:px-8">{children}</div></div>;
}
