import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

// ─── Types ───

interface TodoItem {
  id: string;
  title: string;
  type: "ASSIGNMENT" | "QUIZ";
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

// ─── Helpers ───

function getWeekStart(now: Date): Date {
  const d = new Date(now);
  const day = d.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function bucketItems(
  items: {
    id: string;
    title: string;
    type: string;
    dueDate: Date | null;
    createdAt: Date;
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
  thisWeekEnd.setUTCDate(thisWeekEnd.getUTCDate() + 7);
  const nextWeekEnd = new Date(thisWeekEnd);
  nextWeekEnd.setUTCDate(nextWeekEnd.getUTCDate() + 7);

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
      type: item.type as "ASSIGNMENT" | "QUIZ",
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

// ─── Route Handler ───

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const instituteCode = searchParams.get("institute");
  const courseFilter = searchParams.get("courseId") ?? "all";

  if (!instituteCode) {
    return NextResponse.json(
      { error: "Missing institute query parameter" },
      { status: 400 }
    );
  }

  const studentId = session.user.id;

  // Resolve institute
  const instituteRecord = await db.institute.findUnique({
    where: { code: instituteCode.toLowerCase() },
    select: { id: true },
  });

  if (!instituteRecord) {
    return NextResponse.json(
      { error: "Institute not found" },
      { status: 404 }
    );
  }

  const instituteId = instituteRecord.id;

  // Fetch enrollments
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

  let courseIds = enrollments.map((e) => e.courseId);

  // Apply course filter if specified
  if (courseFilter !== "all") {
    if (!courseIds.includes(courseFilter)) {
      return NextResponse.json(
        { error: "Not enrolled in this course" },
        { status: 403 }
      );
    }
    courseIds = [courseFilter];
  }

  // Fetch submissions to exclude
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

  // Fetch pending items
  const rawItems = await db.syllabusItem.findMany({
    where: {
      courseId: { in: courseIds },
      type: { in: ["ASSIGNMENT", "QUIZ"] },
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

  const buckets = bucketItems(rawItems);

  const enrolledCourses = enrollments.map((e) => ({
    id: e.course.id,
    title: e.course.title,
    code: e.course.code,
  }));

  return NextResponse.json({
    items: buckets,
    enrolledCourses,
    serverNow: new Date(Date.now()).toISOString(),
  });
}
