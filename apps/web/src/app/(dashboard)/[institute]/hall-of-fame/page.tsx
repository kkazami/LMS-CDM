import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isHallOfFameEligible } from "@/lib/hall-of-fame/eligibility";
import { getProfileById } from "@/lib/hall-of-fame/catalog";
import {
  canIbeProgramAccessFeature,
  getHallOfFameCategoryForIbeProgram,
} from "@/lib/ibe-programs/features";
import { resolveIbeStudentProgram } from "@/lib/ibe-programs/registration";
import HallOfFameClient from "@/components/hall-of-fame/HallOfFameClient";
import type { HallOfFameCategory } from "@/lib/hall-of-fame/types";

export const dynamic = "force-dynamic";

export default async function IbeHallOfFamePage({
  params,
  searchParams,
}: {
  params: Promise<{ institute: string }>;
  searchParams?: Promise<{ category?: string; profile?: string }>;
}) {
  const { institute } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?institute=${institute}`);
  }

  // Strictly enforce on the server: Student role only, and IBE institute only.
  // Instructors, admins, superusers, and other institutes cannot access this feature.
  if (!isHallOfFameEligible(session.user) || institute.toLowerCase() !== "ibe") {
    notFound();
  }

  const resolvedProgram = await resolveIbeStudentProgram(session.user.id);
  if (
    !resolvedProgram ||
    !canIbeProgramAccessFeature(resolvedProgram.programCode, "hall-of-fame")
  ) {
    redirect("/ibe/students");
  }

  const lockedCategory = getHallOfFameCategoryForIbeProgram(
    resolvedProgram.programCode
  )!;

  const rawCategory = (resolvedSearchParams.category ?? "").toUpperCase();
  const initialCategory: HallOfFameCategory = lockedCategory;
  void rawCategory;

  const requestedProfileId =
    typeof resolvedSearchParams.profile === "string"
      ? resolvedSearchParams.profile.trim()
      : null;
  const matchedProfile = requestedProfileId
    ? getProfileById(requestedProfileId)
    : undefined;
  const initialProfileId =
    matchedProfile && matchedProfile.category === lockedCategory
      ? matchedProfile.id
      : null;

  return (
    <div className="max-w-7xl mx-auto py-1 sm:py-4">
      <HallOfFameClient
        studentId={session.user.id}
        studentName={session.user.name || "IBE Student"}
        initialCategory={initialCategory}
        initialProfileId={initialProfileId}
        lockedCategory={lockedCategory}
        programCode={resolvedProgram.programCode}
      />
    </div>
  );
}

