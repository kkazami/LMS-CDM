import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { requireMeetingPageActor } from "@/lib/ite/meetings/guard";
import { listMeetings } from "@/lib/ite/meetings/service";
import MeetingsClient from "@/components/meetings/MeetingsClient";

export const dynamic = "force-dynamic";

interface MeetingsPageProps {
  params: Promise<{ institute: string }>;
}

export default async function MeetingsPage({ params }: MeetingsPageProps) {
  const { institute } = await params;
  const actor = await requireMeetingPageActor(institute);
  const theme = getInstituteTheme(institute);

  // Fetch courses visible to this user
  let courses: { id: string; code: string; title: string }[] = [];

  if (actor.role === "PROFESSOR") {
    courses = await db.course.findMany({
      where: {
        instructorId: actor.userId,
        institute: { code: "ite" },
        isArchived: false,
      },
      select: {
        id: true,
        code: true,
        title: true,
      },
      orderBy: { code: "asc" },
    });
  } else {
    const enrollments = await db.enrollment.findMany({
      where: {
        studentId: actor.userId,
        status: "APPROVED",
        course: { institute: { code: "ite" }, isArchived: false },
      },
      select: {
        course: {
          select: {
            id: true,
            code: true,
            title: true,
          },
        },
      },
      orderBy: { course: { code: "asc" } },
    });
    courses = enrollments.map((e) => e.course);
  }

  // Pre-fetch initial meetings
  const initialData = await listMeetings(actor, { take: 20 });

  return (
    <MeetingsClient
      initialMeetings={initialData.meetings}
      initialNextCursor={initialData.nextCursor}
      courses={courses}
      role={actor.role}
      primaryColor={theme.colors.primary}
      instituteCode={institute}
    />
  );
}
