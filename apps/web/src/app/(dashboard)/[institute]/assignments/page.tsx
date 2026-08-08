import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import TodoClient from "./client";

export const dynamic = "force-dynamic";

interface TodoItem {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  createdAt: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  courseSection: string;
  instructorName: string | null;
}

interface BucketedItems {
  noDueDate: TodoItem[];
  thisWeek: TodoItem[];
  nextWeek: TodoItem[];
  later: TodoItem[];
}

/**
 * Compute Monday 00:00 UTC of the week containing `now`.
 */
function getWeekStart(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Bucket items by dueDate relative to UTC now.
 */
function bucketItems(
  items: {
    id: string;
    title: string;
    type: string;
    dueDate: Date | null;
    createdAt: Date;
    courseId: string;
    course: {
      id: string;
      title: string;
      code: string;
      section: string;
      instructor: { name: string } | null;
    };
  }[]
): BucketedItems {
  const now = new Date(Date.now());
  const thisWeekStart = getWeekStart(now);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setUTCDate(thisWeekEnd.getUTCDate() + 7); // Monday next week 00:00
  const nextWeekEnd = new Date(thisWeekEnd);
  nextWeekEnd.setUTCDate(nextWeekEnd.getUTCDate() + 7); // Monday two weeks from now 00:00

  const result: BucketedItems = {
    noDueDate: [],
    thisWeek: [],
    nextWeek: [],
    later: [],
  };

  for (const item of items) {
    const serialized: TodoItem = {
      id: item.id,
      title: item.title,
      type: item.type,
      dueDate: item.dueDate ? item.dueDate.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
      courseId: item.course.id,
      courseTitle: item.course.title,
      courseCode: item.course.code,
      courseSection: item.course.section,
      instructorName: item.course.instructor?.name ?? null,
    };

    if (!item.dueDate) {
      result.noDueDate.push(serialized);
    } else if (item.dueDate >= thisWeekStart && item.dueDate < thisWeekEnd) {
      result.thisWeek.push(serialized);
    } else if (item.dueDate >= thisWeekEnd && item.dueDate < nextWeekEnd) {
      result.nextWeek.push(serialized);
    } else {
      result.later.push(serialized);
    }
  }

  return result;
}

export default async function TodoPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const theme = getInstituteTheme(institute);
  const studentId = session.user.id;

  // Resolve institute record
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  const instituteId = instituteRecord.id;

  // 1. Fetch enrollments
  const enrollments = await db.enrollment.findMany({
    where: {
      studentId,
      status: "APPROVED",
      course: { instituteId, isArchived: false },
    },
    select: {
      courseId: true,
      course: {
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
          instructor: { select: { name: true } },
        },
      },
    },
  });

  const courseIds = enrollments.map((e) => e.courseId);

  // 2. Fetch already-submitted/graded items to exclude
  const submissions = await db.studentSubmission.findMany({
    where: {
      studentId,
      syllabusItem: { courseId: { in: courseIds } },
    },
    select: { syllabusItemId: true, status: true },
  });

  const submittedIds = new Set(
    submissions
      .filter((s) =>
        ["SUBMITTED", "GRADED", "RETURNED"].includes(s.status)
      )
      .map((s) => s.syllabusItemId)
  );

  // 3. Fetch pending syllabus items (ASSIGNMENT or QUIZ) not yet submitted
  const rawItems = await db.syllabusItem.findMany({
    where: {
      courseId: { in: courseIds },
      type: { not: "MATERIAL" },
      id: { notIn: [...submittedIds] },
    },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          code: true,
          section: true,
          instructor: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 4. Bucket by due date
  const buckets = bucketItems(rawItems);

  // 5. Enrolled courses for the filter dropdown
  const enrolledCourses = enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    code: e.course.code,
  }));

  const nowIso = new Date(Date.now()).toISOString();

  return (
    <TodoClient
      items={buckets}
      enrolledCourses={enrolledCourses}
      instituteCode={theme.code}
      theme={theme}
      serverNow={nowIso}
    />
  );
}
