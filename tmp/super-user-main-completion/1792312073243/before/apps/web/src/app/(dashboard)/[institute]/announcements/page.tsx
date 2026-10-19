import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
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
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const theme = getInstituteTheme(institute);
  const role = (session.user.role as string).toUpperCase();

  // Only students see this view — professors/admins redirect to dashboard
  if (role !== "STUDENT") {
    redirect(`/${institute}`);
  }

  const studentId = session.user.id;

  // Resolve institute record
  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  if (!instituteRecord) {
    redirect(`/login?institute=${institute}`);
  }

  // ── 1. Fetch student's APPROVED enrollments ──
  // Same source as Grades page and sidebar accordion
  const enrollments = await db.enrollment.findMany({
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
  });

  const enrolledCourses: EnrolledCourseOption[] = enrollments.map((e) => e.course);
  const courseIds = enrolledCourses.map((c) => c.id);

  // ── 2. Fetch REAL announcements for enrolled courses ──
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
    />
  );
}
