import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { redirect } from "next/navigation";
import PeopleClient from "./client";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function PeoplePage({ params }: PageProps) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);
  const role = session.user.role.toUpperCase();

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });

  if (!course) redirect(`/${institute}/courses`);

  const isInstructor = course.instructorId === session.user.id;
  const isAdmin = role === "ADMIN";
  const canManage = isInstructor || isAdmin;

  // Get enrolled students
  const enrollments = await db.enrollment.findMany({
    where: { courseId, status: "APPROVED" },
    include: {
      student: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { student: { name: "asc" } },
  });

  // Get pending requests (only for instructor/admin)
  const pendingRequests = canManage
    ? await db.enrollment.findMany({
        where: { courseId, status: "PENDING" },
        include: {
          student: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // Get student groups
  const studentGroups = await db.studentGroup.findMany({
    where: { courseId },
    include: {
      members: {
        include: {
          student: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { groupName: "asc" },
  });

  // Serialize
  const enrolledStudents = enrollments.map((e) => ({
    enrollmentId: e.id,
    ...e.student,
  }));

  const pendingSerialized = pendingRequests.map((e) => ({
    enrollmentId: e.id,
    createdAt: e.createdAt.toISOString(),
    ...e.student,
  }));

  const groupsSerialized = studentGroups.map((g) => ({
    id: g.id,
    groupName: g.groupName,
    members: g.members.map((m) => ({
      id: m.student.id,
      name: m.student.name,
    })),
  }));

  return (
    <PeopleClient
      courseId={courseId}
      instituteCode={institute}
      theme={theme}
      instructor={course.instructor}
      enrolledStudents={enrolledStudents}
      pendingRequests={pendingSerialized}
      studentGroups={groupsSerialized}
      canManage={canManage}
      currentUserId={session.user.id}
    />
  );
}
