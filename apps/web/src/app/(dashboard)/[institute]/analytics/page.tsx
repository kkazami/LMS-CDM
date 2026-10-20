import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
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
  const user = await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/analytics/page.tsx", await params);

  const { institute } = await params;

  const theme = getInstituteTheme(institute);
  const role = (user.role as string).toUpperCase();

  // Instructor/Admin only
  if (role !== "PROFESSOR" && role !== "TEACHER" && role !== "ADMIN") {
    redirect(`/${institute}`);
  }

  const instituteRecord = user.institute;

  if (instituteRecord.code.toLowerCase() !== institute.toLowerCase()) {
    redirect(`/login?institute=${institute}`);
  }

  // Fetch taught courses for the instructor
  const taughtCourses: TaughtCourseOption[] = await db.course.findMany({
    where:
      role === "ADMIN"
        ? { instituteId: instituteRecord.id, isArchived: false }
        : { instructorId: user.id, instituteId: instituteRecord.id, isArchived: false },
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
