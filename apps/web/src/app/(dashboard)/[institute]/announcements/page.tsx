import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import AnnouncementsClient from "./client";

export const dynamic = "force-dynamic";

/** Serializable shape passed to the client. */
export interface AnnouncementItem {
  id: string;
  content: string;
  authorName: string;
  authorAvatarUrl: string | null;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  createdAt: string; // ISO string
}

export interface EnrolledCourseOption {
  id: string;
  title: string;
  code: string;
}

export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const user = await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/announcements/page.tsx", await params);

  const { institute } = await params;

  const theme = getInstituteTheme(institute);
  const role = (user.role as string).toUpperCase();

  const isInstructor = ["PROFESSOR", "TEACHER", "INSTRUCTOR"].includes(role);
  if (role !== "STUDENT" && !isInstructor) {
    redirect(`/${institute}`);
  }

  const studentId = user.id;

  const instituteRecord = user.institute;

  if (instituteRecord.code.toLowerCase() !== institute.toLowerCase()) {
    redirect(`/login?institute=${institute}`);
  }

  // Faculty see only their assigned classes; students retain approved enrollments.
  const enrolledCourses: EnrolledCourseOption[] = isInstructor
    ? await db.course.findMany({
        where: { instructorId: user.id, instituteId: instituteRecord.id, isArchived: false },
        select: { id: true, title: true, code: true },
        orderBy: { code: "asc" },
      })
    : (await db.enrollment.findMany({
        where: {
          studentId,
          status: "APPROVED",
          course: {
            instituteId: instituteRecord.id,
            isArchived: false,
          },
        },
        select: {
          course: {
            select: {
              id: true,
              title: true,
              code: true,
            },
          },
        },
        orderBy: { displayOrderIndex: "asc" },
      })).map(e => e.course);
  const courseIds = enrolledCourses.map((c) => c.id);

  // ── 2. Fetch announcements for the authorized classes ──
  const announcements =
    courseIds.length === 0
      ? []
      : await db.announcement.findMany({
          where: {
            courseId: { in: courseIds },
          },
          include: {
            author: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
            course: {
              select: {
                id: true,
                title: true,
                code: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });

  // ── 3. Map to serializable shape ──
  const announcementItems: AnnouncementItem[] = announcements.map((a) => ({
    id: a.id,
    content: a.content,
    authorName: a.author?.name || "Unknown Instructor",
    authorAvatarUrl: (a.author as Record<string, unknown>)?.avatarUrl as string | null ?? null,
    courseId: a.course.id,
    courseTitle: a.course.title,
    courseCode: a.course.code,
    createdAt: a.createdAt.toISOString(),
  }));

  return (
    <AnnouncementsClient
      announcements={announcementItems}
      enrolledCourses={enrolledCourses}
      theme={theme}
      instituteCode={theme.code}
      isInstructor={isInstructor}
    />
  );
}
