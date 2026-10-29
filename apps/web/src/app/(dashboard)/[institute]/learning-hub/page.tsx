import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import {
  ensureLearningHubTable,
  isLearningHubEligible,
  toStudentLearningRecord,
  type RawIbeLearningRecordRow,
} from "@/lib/learning-hub/access";
import LearningHubClient from "@/components/learning-hub/LearningHubClient";

export const dynamic = "force-dynamic";

export default async function IbeLearningHubPage({
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
  if (!isLearningHubEligible(session.user) || institute.toLowerCase() !== "ibe") {
    notFound();
  }

  let rows: RawIbeLearningRecordRow[] = [];
  try {
    await ensureLearningHubTable();
    rows = await db.ibeLearningRecord.findMany({
      where: { studentId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  } catch (error) {
    console.error("[IbeLearningHubPage] Failed to load student learning records:", error);
  }

  const initialRecords = rows.map(toStudentLearningRecord);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <LearningHubClient
        instituteCode={institute}
        initialRecords={initialRecords}
        studentName={session.user.name || "IBE Student"}
      />
    </div>
  );
}

