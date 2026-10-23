import { getInstituteTheme } from "@/lib/get-institute-theme";
import { uploadsConfigured } from "@/lib/practicum/blob";
import { requirePracticumPageActor } from "@/lib/practicum/guard";
import { getPlacementSubmissions, getStudentPlacements, getSupervisorPlacements } from "@/lib/practicum/service";
import StudentPracticumClient from "@/components/practicum/StudentPracticumClient";
import SupervisorPracticumClient from "@/components/practicum/SupervisorPracticumClient";

export const dynamic = "force-dynamic";

interface PracticumPageProps {
  params: Promise<{ institute: string }>;
  searchParams: Promise<{ placement?: string }>;
}

/** ITE-only. Students see their own placement; instructors see the student teachers they supervise. */
export default async function PracticumPage({ params, searchParams }: PracticumPageProps) {
  const { institute } = await params;
  const actor = await requirePracticumPageActor(institute, ["STUDENT", "INSTRUCTOR"]);
  const theme = getInstituteTheme(institute);

  if (actor.role === "INSTRUCTOR") {
    const placements = await getSupervisorPlacements(actor.userId);
    return (
      <SupervisorPracticumClient
        instituteCode={institute}
        placements={placements}
        primaryColor={theme.colors.primary}
      />
    );
  }

  // Student: only ever their own placements. A ?placement= id is honoured only if it is one of them.
  const placements = await getStudentPlacements(actor.userId);
  const requested = (await searchParams).placement;
  const placement = placements.find((p) => p.id === requested) ?? placements[0] ?? null;
  const submissions = placement ? await getPlacementSubmissions(placement.id) : [];

  return (
    <StudentPracticumClient
      placements={placements}
      placement={placement}
      submissions={submissions}
      uploadsConfigured={uploadsConfigured()}
      primaryColor={theme.colors.primary}
    />
  );
}
