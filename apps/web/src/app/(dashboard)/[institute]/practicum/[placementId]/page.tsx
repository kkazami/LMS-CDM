import { notFound } from "next/navigation";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { requirePracticumPageActor } from "@/lib/practicum/guard";
import { canDeletePlacement } from "@/lib/practicum/rules";
import { getPlacementDTO, getPlacementSubmissions } from "@/lib/practicum/service";
import PlacementDetailClient from "@/components/practicum/PlacementDetailClient";

export const dynamic = "force-dynamic";

interface PlacementPageProps {
  params: Promise<{ institute: string; placementId: string }>;
}

/** Supervisor/admin view of one student teacher. Only the placement's own supervisor or an ITE admin can open it. */
export default async function PlacementDetailPage({ params }: PlacementPageProps) {
  const { institute, placementId } = await params;
  const actor = await requirePracticumPageActor(institute, ["INSTRUCTOR", "ADMIN"]);
  const theme = getInstituteTheme(institute);

  const placement = await getPlacementDTO(placementId);
  if (!placement || (actor.role !== "ADMIN" && placement.supervisorId !== actor.userId)) notFound();

  const submissions = await getPlacementSubmissions(placement.id);
  const canDelete = canDeletePlacement({ id: actor.userId, role: actor.role, isIte: true }, placement);

  return (
    <PlacementDetailClient
      instituteCode={institute}
      placement={placement}
      submissions={submissions}
      primaryColor={theme.colors.primary}
      canDelete={canDelete}
    />
  );
}
