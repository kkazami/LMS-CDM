import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import {
  isBusinessPlanEligible,
  loadOwnedBusinessPlan,
  toBusinessPlanRecord,
} from "@/lib/business-plan/access";
import BusinessPlanEditorClient from "@/components/business-plan/BusinessPlanEditorClient";

export const dynamic = "force-dynamic";

export default async function BusinessPlanEditorPage({
  params,
}: {
  params: Promise<{ institute: string; id: string }>;
}) {
  const { institute, id } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?institute=${institute}`);
  }

  // Strictly enforce: Student role only, and IBE institute only.
  if (!isBusinessPlanEligible(session.user) || institute.toLowerCase() !== "ibe") {
    notFound();
  }

  let owned = null;
  try {
    owned = await loadOwnedBusinessPlan(id, session.user.id);
  } catch (error) {
    console.error("[BusinessPlanEditorPage] Failed to load plan:", error);
  }

  if (!owned) {
    notFound();
  }

  const initialRecord = toBusinessPlanRecord(owned);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BusinessPlanEditorClient
        instituteCode={institute}
        initialRecord={initialRecord}
        studentName={session.user.name || "IBE Student"}
      />
    </div>
  );
}
