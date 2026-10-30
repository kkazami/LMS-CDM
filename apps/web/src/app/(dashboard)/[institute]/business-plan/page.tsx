import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  ensureBusinessPlanTable,
  isBusinessPlanEligible,
  toBusinessPlanSummary,
  type RawBusinessPlanRow,
} from "@/lib/business-plan/access";
import BusinessPlanHubClient from "@/components/business-plan/BusinessPlanHubClient";

export const dynamic = "force-dynamic";

export default async function BusinessPlanHubPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?institute=${institute}`);
  }

  // Strictly enforce: Student role only, and IBE institute only.
  // Instructors, admins, and other institutes cannot access this feature.
  if (!isBusinessPlanEligible(session.user) || institute.toLowerCase() !== "ibe") {
    notFound();
  }

  let rows: RawBusinessPlanRow[] = [];
  try {
    await ensureBusinessPlanTable();
    rows = await db.businessPlan.findMany({
      where: { studentId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  } catch (error) {
    console.error("[BusinessPlanHubPage] Failed to load saved plans:", error);
  }

  const initialPlans = rows.map(toBusinessPlanSummary);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BusinessPlanHubClient
        instituteCode={institute}
        initialPlans={initialPlans}
        studentName={session.user.name || "IBE Student"}
      />
    </div>
  );
}
