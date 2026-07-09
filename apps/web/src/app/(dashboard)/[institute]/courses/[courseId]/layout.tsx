import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import CourseHeader from "@/components/courses/CourseHeader";
import CourseTabs from "@/components/courses/CourseTabs";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function CourseInteriorLayout({
  children,
  params,
}: LayoutProps) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const theme = getInstituteTheme(institute);

  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { name: true } },
      _count: {
        select: {
          enrollments: { where: { status: "PENDING" } },
        },
      },
    },
  });

  if (!course) {
    redirect(`/${institute}/courses`);
  }

  // Access control: user must be instructor, enrolled student, or admin
  const userRole = session.user.role.toUpperCase();
  const isInstructor = course.instructorId === session.user.id;
  const isAdmin = userRole === "ADMIN";

  if (!isInstructor && !isAdmin) {
    // Check if student is enrolled
    const enrollment = await db.enrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: course.id,
          studentId: session.user.id,
        },
      },
    });

    if (!enrollment || enrollment.status !== "APPROVED") {
      redirect(`/${institute}/courses`);
    }
  }

  const showPendingCount =
    isInstructor || isAdmin ? course._count.enrollments : 0;

  return (
    <div className="-m-4 lg:-m-8">
      <div className="px-4 pt-4 md:px-8 md:pt-6">
        <CourseHeader course={course} theme={theme} />
      </div>
      <div className="mt-4">
        <CourseTabs
          courseId={courseId}
          instituteCode={institute}
          theme={theme}
          pendingCount={showPendingCount}
          isInstructor={isInstructor || isAdmin}
        />
      </div>
      <div className="px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}
