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

export async function GET(request: Request) {
  const denial = await denyLegacyApi(request, 'GET mobile/dashboard');
  if (denial) return denial;
  const user = await actor(request);
  if (!user) return NextResponse.json({ message: 'Sign in with an ICS student or faculty account.' }, { status: 403 });
  try {
    const student = user.role === 'STUDENT';
    const scope = { instituteId: user.instituteId, isArchived: false,
      ...(student ? { enrollments: { some: { studentId: user.id, status: 'APPROVED' } } } : { instructorId: user.id }) };
    const [courses, calendar] = await Promise.all([
      db.course.findMany({ where: scope, orderBy: { createdAt: 'desc' }, select: {
        id: true, code: true, courseCode: true, title: true, description: true, section: true, subject: true,
        room: true, coverImage: true, instructor: { select: { name: true } },
        _count: { select: { enrollments: { where: { status: 'APPROVED' } } } },
      } }),
      getDashboardCalendar(user, 'ics'),
    ]);
    const ids = courses.map(course => course.id);
    const [order, pendingEnrollments, pendingWork, submissions] = await Promise.all([
      student ? db.enrollment.findMany({ where: { studentId: user.id, courseId: { in: ids }, status: 'APPROVED' }, select: { courseId: true, displayOrderIndex: true } })
        : db.dashboardLayout.findMany({ where: { userId: user.id, courseId: { in: ids } }, select: { courseId: true, displayOrderIndex: true } }),
      student ? [] : db.enrollment.groupBy({ by: ['courseId'], where: { courseId: { in: ids }, status: 'PENDING' }, _count: { _all: true } }),
      student ? [] : db.syllabusItem.findMany({ where: { courseId: { in: ids }, submissions: { some: { status: 'SUBMITTED', grade: null } } }, select: { courseId: true, _count: { select: { submissions: { where: { status: 'SUBMITTED', grade: null } } } } } }),
      student ? db.studentSubmission.findMany({ where: { studentId: user.id, syllabusItem: { courseId: { in: ids } }, status: { in: ['SUBMITTED', 'GRADED', 'RETURNED'] } }, select: { syllabusItemId: true } }) : [],
    ]);
    const positions = new Map(order.map(item => [item.courseId, item.displayOrderIndex]));
    const submitted = new Set(submissions.map(item => `syllabus_${item.syllabusItemId}`));
    const deadlines = calendar.events.filter(event => event.source === 'classwork' && !submitted.has(event.id));
    const now = Date.now(), nextWeek = now + 7 * 86400000;
    return NextResponse.json({
      courses: courses.map(({ _count, instructor, ...course }) => ({ ...course, isArchived: false,
        instructorName: instructor?.name ?? null, enrolledCount: _count.enrollments, studentCount: _count.enrollments,
        pendingCount: pendingEnrollments.find(item => item.courseId === course.id)?._count._all ?? 0,
        pendingWorkCount: pendingWork.filter(item => item.courseId === course.id).reduce((sum, item) => sum + item._count.submissions, 0),
      })).sort((a, b) => (positions.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (positions.get(b.id) ?? Number.MAX_SAFE_INTEGER)),
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
