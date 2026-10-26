import { labsAvailable } from '@/lib/labs/readiness';
import { requireCourseAccess } from '@/lib/course-access';
import { canonicalRole } from '@/lib/super-user-v1/capabilities';
import { visibleSyllabusForms } from '@/lib/forms/visibility';
import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
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
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/courses/[courseId]/classwork/page.tsx", await params);

  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  try { await requireCourseAccess(session.user, courseId); } catch { redirect(`/${institute}/courses`); }

  const theme = getInstituteTheme(institute);
  const role = canonicalRole(session.user.role);
  const isProfessor = role === "INSTRUCTOR";
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
    where: { courseId, ...(!canEdit ? await visibleSyllabusForms(undefined, session.user.id) : {}) },
    include: {
      labAssignment: await labsAvailable() ? ({ select: { id: true } } as const) : false as const,
      targetGroups: {
        include: {
          group: { select: { groupName: true } },
        },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
        select: { id: true, type: true, url: true, fileName: true, fileSize: true },
      },
      leaderboardRewards: {
        orderBy: { placement: "asc" },
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
    labAssignmentId: item.labAssignment?.id ?? null,
    type: item.type,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate ? item.dueDate.toISOString() : null,
    maxPoints: item.maxPoints,
    enableIntegrityMonitoring: Boolean(item.enableIntegrityMonitoring),
    requireFullscreen: Boolean(item.requireFullscreen),
    leaderboardEnabled: Boolean(item.leaderboardEnabled),
    leaderboardRewards: item.leaderboardRewards?.map((r) => ({
      placement: r.placement,
      rewardLabel: r.rewardLabel,
      bonusExp: r.bonusExp,
    })) || [],
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
      labsReady={await labsAvailable()}
      items={serialized}
      courseId={courseId}
      instituteCode={institute}
      theme={theme}
      canEdit={canEdit}
      studentGroups={studentGroups}
    />
  );
}
