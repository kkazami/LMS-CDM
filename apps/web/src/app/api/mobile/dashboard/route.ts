import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { getDashboardCalendar } from '@/lib/student-calendar-data';

export const dynamic = 'force-dynamic';

async function actor(request: Request) {
  const session = await getSessionFromRequest(request);
  const user = session?.user;
  return user?.institute.code.toLowerCase() === 'ics' && ['STUDENT', 'PROFESSOR', 'TEACHER'].includes(user.role) ? user : null;
}

async function loadDashboardCourses(user: { id: string; role: string; instituteId: string }) {
  const student = user.role === 'STUDENT';
  const scope = { instituteId: user.instituteId, isArchived: false,
    ...(student ? { enrollments: { some: { studentId: user.id, status: 'APPROVED' } } } : { instructorId: user.id }) };
  const courses = await db.course.findMany({ where: scope, orderBy: { createdAt: 'desc' }, select: {
    id: true, code: true, courseCode: true, title: true, description: true, section: true, subject: true,
    room: true, coverImage: true, mobileCoverImage: true, instructor: { select: { name: true } },
    _count: { select: { enrollments: { where: { status: 'APPROVED' } } } },
    enrollments: student ? { where: { studentId: user.id, status: 'APPROVED' }, select: { displayOrderIndex: true } } : false,
    dashboardLayouts: student ? false : { where: { userId: user.id }, select: { displayOrderIndex: true } },
  } });
  if (!courses.length) return { courses: [], submissions: [] };

  const ids = courses.map(course => course.id);
  const [pendingEnrollments, pendingWork, submissions] = await Promise.all([
    student ? [] : db.enrollment.groupBy({ by: ['courseId'], where: { courseId: { in: ids }, status: 'PENDING' }, _count: { _all: true } }),
    student ? [] : db.syllabusItem.findMany({ where: { courseId: { in: ids }, submissions: { some: { status: 'SUBMITTED', grade: null } } }, select: { courseId: true, _count: { select: { submissions: { where: { status: 'SUBMITTED', grade: null } } } } } }),
    student ? db.studentSubmission.findMany({ where: { studentId: user.id, syllabusItem: { courseId: { in: ids } }, status: { in: ['SUBMITTED', 'GRADED', 'RETURNED'] } }, select: { syllabusItemId: true } }) : [],
  ]);
  const pendingByCourse = new Map(pendingEnrollments.map(item => [item.courseId, item._count._all]));
  const workByCourse = new Map<string, number>();
  for (const item of pendingWork) {
    workByCourse.set(item.courseId, (workByCourse.get(item.courseId) ?? 0) + item._count.submissions);
  }
  const position = (course: typeof courses[number]) =>
    (student ? course.enrollments?.[0] : course.dashboardLayouts?.[0])?.displayOrderIndex ?? Number.MAX_SAFE_INTEGER;
  return {
    courses: courses.sort((a, b) => position(a) - position(b)).map(({ _count, instructor, enrollments, dashboardLayouts, ...course }) => ({
      ...course, isArchived: false,
      instructorName: instructor?.name ?? null, enrolledCount: _count.enrollments, studentCount: _count.enrollments,
      pendingCount: pendingByCourse.get(course.id) ?? 0,
      pendingWorkCount: workByCourse.get(course.id) ?? 0,
    })),
    submissions,
  };
}

export async function GET(request: Request) {
  const denial = await denyLegacyApi(request, 'GET mobile/dashboard');
  if (denial) return denial;
  const user = await actor(request);
  if (!user) return NextResponse.json({ message: 'Sign in with an ICS student or faculty account.' }, { status: 403 });
  try {
    const [{ courses, submissions }, calendar] = await Promise.all([
      loadDashboardCourses(user),
      getDashboardCalendar(user, 'ics'),
    ]);
    const submitted = new Set(submissions.map(item => `syllabus_${item.syllabusItemId}`));
    const deadlines = calendar.events.filter(event => event.source === 'classwork' && !submitted.has(event.id));
    const now = Date.now(), nextWeek = now + 7 * 86400000;
    return NextResponse.json({
      courses,
      calendar,
      pendingAssignments: deadlines,
      overdue: deadlines.filter(event => Date.parse(event.eventDate) < now).length,
      dueSoon: deadlines.filter(event => Date.parse(event.eventDate) >= now && Date.parse(event.eventDate) <= nextWeek).length,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ message: 'Could not load your dashboard. Please try again.' }, { status: 500 });
  }
}

const reorderInput = z.object({ courseIds: z.array(z.string().regex(/^[A-Za-z0-9_-]+$/)).min(1).max(200) });

export async function PATCH(request: Request) {
  const denial = await denyLegacyApi(request, 'PATCH mobile/dashboard');
  if (denial) return denial;
  const user = await actor(request);
  if (!user) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  const input = reorderInput.safeParse(await request.json().catch(() => null));
  if (!input.success || new Set(input.data.courseIds).size !== input.data.courseIds.length) return NextResponse.json({ message: 'Invalid course order.' }, { status: 400 });
  try {
    const student = user.role === 'STUDENT', ids = input.data.courseIds;
    const allowed = await db.course.count({ where: { id: { in: ids }, instituteId: user.instituteId, isArchived: false,
      ...(student ? { enrollments: { some: { studentId: user.id, status: 'APPROVED' } } } : { instructorId: user.id }) } });
    if (allowed !== ids.length) return NextResponse.json({ message: 'Course access denied.' }, { status: 403 });
    await db.$transaction(ids.map((courseId, displayOrderIndex) => student
      ? db.enrollment.updateMany({ where: { courseId, studentId: user.id, status: 'APPROVED' }, data: { displayOrderIndex } })
      : db.dashboardLayout.upsert({ where: { userId_courseId: { userId: user.id, courseId } }, create: { userId: user.id, courseId, displayOrderIndex }, update: { displayOrderIndex } })));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: 'Could not save course order.' }, { status: 500 });
  }
}
