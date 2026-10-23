import { notFound } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { requirePracticumPageActor } from "@/lib/practicum/guard";
import { getPlacementDTO, getPlacementSubmissions } from "@/lib/practicum/service";
import PlacementDetailClient from "@/components/practicum/PlacementDetailClient";

export const dynamic = "force-dynamic";

interface PlacementPageProps {
  params: Promise<{ institute: string; placementId: string }>;
}

/** Supervisor view of one student teacher. Only the placement's own supervisor can open it. */
export default async function PlacementDetailPage({ params }: PlacementPageProps) {
  const { institute, placementId } = await params;
  const actor = await requirePracticumPageActor(institute, ["INSTRUCTOR"]);
  const theme = getInstituteTheme(institute);

  const placement = await getPlacementDTO(placementId);
  if (!placement || placement.supervisorId !== actor.userId) notFound();

  const submissions = await getPlacementSubmissions(placement.id);

  return (
    <PlacementDetailClient
      instituteCode={institute}
      placement={placement}
      submissions={submissions}
      primaryColor={theme.colors.primary}
    />
  );
}
