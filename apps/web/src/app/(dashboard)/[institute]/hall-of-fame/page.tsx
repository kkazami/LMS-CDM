import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isHallOfFameEligible } from "@/lib/hall-of-fame/eligibility";
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

  const rawCategory = (resolvedSearchParams.category ?? "").toUpperCase();
  const initialCategory: HallOfFameCategory | null =
    rawCategory === "ENTREPRENEUR" || rawCategory === "HR_LEADER"
      ? (rawCategory as HallOfFameCategory)
      : null;

  const initialProfileId =
    typeof resolvedSearchParams.profile === "string"
      ? resolvedSearchParams.profile.trim()
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <HallOfFameClient
        studentId={session.user.id}
        studentName={session.user.name || "IBE Student"}
        initialCategory={initialCategory}
        initialProfileId={initialProfileId}
      />
    </div>
  );
}

