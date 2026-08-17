import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { redirect } from "next/navigation";
import BroadcastClient from "./client";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function BroadcastPage({ params }: PageProps) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);
  const role = session.user.role.toUpperCase();

  // Only instructors/admins can access
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}/courses/${courseId}/stream`);
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, code: true, instructorId: true },
  });

  if (!course) redirect(`/${institute}/courses`);

  const isInstructor = course.instructorId === session.user.id;
  const isAdmin = role === "ADMIN";

  if (!isInstructor && !isAdmin) {
    redirect(`/${institute}/courses/${courseId}/stream`);
  }

  // Get enrolled students for the multi-select picker (same source as People page)
  const enrollments = await db.enrollment.findMany({
    where: { courseId, status: "APPROVED" },
    include: {
      student: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  const enrolledStudents = enrollments.map((e) => ({
    id: e.student.id,
    name: e.student.name,
    email: e.student.email,
    avatarUrl: e.student.avatarUrl,
  }));

  // Get broadcast history for this course by this instructor
  const broadcasts = await db.notificationBroadcast.findMany({
    where: { courseId, senderId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Resolve student names for scoped broadcasts
  const allStudentIds = new Set<string>();
  for (const b of broadcasts) {
    if (b.scope !== "ALL") {
      try {
        const ids = JSON.parse(b.scope) as string[];
        ids.forEach((id) => allStudentIds.add(id));
      } catch {
        // invalid JSON — ignore
      }
    }
  }

  const studentNameMap: Record<string, string> = {};
  if (allStudentIds.size > 0) {
    const students = await db.user.findMany({
      where: { id: { in: Array.from(allStudentIds) } },
      select: { id: true, name: true },
    });
    for (const s of students) {
      studentNameMap[s.id] = s.name;
    }
  }

  const serializedBroadcasts = broadcasts.map((b) => {
    let scopeLabel: string;
    if (b.scope === "ALL") {
      scopeLabel = `Entire class (${b.recipientCount} student${b.recipientCount !== 1 ? "s" : ""})`;
    } else {
      try {
        const ids = JSON.parse(b.scope) as string[];
        const names = ids.map((id) => studentNameMap[id] || "Unknown").join(", ");
        scopeLabel = names;
      } catch {
        scopeLabel = `${b.recipientCount} student${b.recipientCount !== 1 ? "s" : ""}`;
      }
    }

    return {
      id: b.id,
      message: b.message,
      category: b.category,
      scopeLabel,
      recipientCount: b.recipientCount,
      createdAt: b.createdAt.toISOString(),
    };
  });

  return (
    <BroadcastClient
      courseId={courseId}
      courseCode={course.code}
      instituteCode={institute}
      theme={theme}
      enrolledStudents={enrolledStudents}
      broadcasts={serializedBroadcasts}
    />
  );
}
