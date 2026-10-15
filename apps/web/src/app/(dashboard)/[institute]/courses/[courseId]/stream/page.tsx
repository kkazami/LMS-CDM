import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { logActivity } from "@/lib/ite/activity-logger";
import StreamClient from "./client";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function StreamPage({ params }: PageProps) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);
  const role = session.user.role.toUpperCase();
  const canPost = role === "PROFESSOR" || role === "TEACHER" || role === "ADMIN";

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true },
  });

  if (!course) redirect(`/${institute}/courses`);

  const isInstructor = course.instructorId === session.user.id;

  const announcements = await db.announcement.findMany({
    where: { courseId },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for client
  const serialized = announcements.map((a) => ({
    id: a.id,
    content: a.content,
    createdAt: a.createdAt.toISOString(),
    author: a.author,
  }));

  // Log ANNOUNCEMENT_READ event for students (deduplicated, no-op for non-ITE)
  if (role === "STUDENT") {
    after(async () => {
      try {
        await logActivity({
          userId: session.user.id,
          instituteId: (session.user as Record<string, unknown>).instituteId as string | undefined,
          courseId,
          type: "ANNOUNCEMENT_READ",
          refId: announcements[0]?.id ?? null,
        });
      } catch (err) {
        console.error("[activity-logger] announcement read error:", err);
      }
    });
  }

  return (
    <StreamClient
      announcements={serialized}
      courseId={courseId}
      instituteCode={institute}
      theme={theme}
      canPost={canPost && (isInstructor || role === "ADMIN")}
    />
  );
}
