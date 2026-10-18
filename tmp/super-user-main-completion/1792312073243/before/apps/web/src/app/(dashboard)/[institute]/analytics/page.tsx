import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import AnalyticsClient from "./client";

export const dynamic = "force-dynamic";

export interface TaughtCourseOption {
  id: string;
  title: string;
  code: string;
}

export default async function AnalyticsPage({
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
  const role = (session.user.role as string).toUpperCase();

  // Instructor/Admin only
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  // Fetch taught courses for the instructor
  const taughtCourses: TaughtCourseOption[] = await db.course.findMany({
    where:
      role === "ADMIN"
        ? { instituteId: instituteRecord.id, isArchived: false }
        : { instructorId: session.user.id, instituteId: instituteRecord.id, isArchived: false },
    select: { id: true, title: true, code: true },
    orderBy: { code: "asc" },
  });

  return (
    <AnalyticsClient
      taughtCourses={taughtCourses}
      theme={theme}
      instituteCode={theme.code}
    />
  );
}
