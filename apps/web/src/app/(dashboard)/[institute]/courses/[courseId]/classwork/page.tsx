import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { redirect } from "next/navigation";
import { resolveGroupPermissions } from "@/lib/skills";
import ClassworkClient from "./client";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function ClassworkPage({ params }: PageProps) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);
  const role = session.user.role.toUpperCase();
  const isProfessor = role === "PROFESSOR" || role === "TEACHER";
  const isAdmin = role === "ADMIN";

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, instructorId: true },
  });

  if (!course) redirect(`/${institute}/courses`);

  const canEdit =
    (isProfessor && course.instructorId === session.user.id) || isAdmin;

  // Get all syllabus items
  let syllabusItems = await db.syllabusItem.findMany({
    where: { courseId },
    include: {
      targetGroups: {
        include: {
          group: { select: { groupName: true } },
        },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, type: true, url: true, fileName: true, fileSize: true },
      },
    },
    orderBy: { orderIndex: "asc" },
  });

  // For students: filter by group permissions using the agentic skill
  if (!canEdit) {
    const permResult = await resolveGroupPermissions(courseId, session.user.id);
    if (permResult.success && permResult.data) {
      const visibleIds = new Set(permResult.data.visibleItemIds);
      syllabusItems = syllabusItems.filter((item) => visibleIds.has(item.id));
    }
  }

  // Get student groups for the target selector (only for instructors)
  const studentGroups = canEdit
    ? await db.studentGroup.findMany({
        where: { courseId },
        select: { id: true, groupName: true },
        orderBy: { groupName: "asc" },
      })
    : [];

  // Serialize dates
  const serialized = syllabusItems.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    maxPoints: item.maxPoints,
    targetGroups: item.targetGroups.map((tg) => ({
      groupId: tg.groupId,
      group: tg.group,
    })),
    attachments: item.attachments.map((a) => ({
      id: a.id,
      type: a.type,
      url: a.url,
      fileName: a.fileName,
      fileSize: a.fileSize,
    })),
  }));

  return (
    <ClassworkClient
      items={serialized}
      courseId={courseId}
      instituteCode={institute}
      theme={theme}
      canEdit={canEdit}
      studentGroups={studentGroups}
    />
  );
}
