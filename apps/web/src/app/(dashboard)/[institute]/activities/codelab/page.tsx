/**
 * CodeLab Problem Browser Page
 * Route: /[institute]/activities/codelab
 *
 * ICS-Exclusive Coding Activity Hub.
 * Shows all 30 algorithmic problems categorized by level and language.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isEligibleForActivities, isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { db } from "@/lib/db";
import { getProblemSummaries } from "@/features/interactive-activities/codelab/problems";
import { CodeLabBrowserClient } from "@/features/interactive-activities/codelab/components/CodeLabBrowserClient";

export default async function CodeLabBrowserPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Enforce ICS-only feature guard
  const eligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role,
      instituteId: session.user.instituteId,
    },
  });

  if (!eligible || !isEligibleInstituteCode(institute)) {
    notFound();
  }

  // 2. Fetch student's existing submissions for CodeLab problems
  const submissions = await db.activitySubmission.findMany({
    where: {
      studentId: session.user.id,
      activityType: "codelab",
    },
    orderBy: { submittedAt: "desc" },
    select: {
      templateId: true,
      score: true,
      passed: true,
      stateCheck: true,
      submittedAt: true,
    },
  });

  // 3. Aggregate scores and rejection status per problem
  const submissionMap: Record<
    string,
    {
      bestScore: number;
      attempts: number;
      completed: boolean;
      isRejected?: boolean;
      rejectionReason?: string;
    }
  > = {};

  for (const sub of submissions) {
    const key = sub.templateId;
    let isRejected = false;
    let rejectionReason: string | undefined = undefined;

    try {
      const stateObj = JSON.parse(sub.stateCheck || "{}");
      isRejected = Boolean(stateObj.isRejected);
      rejectionReason =
        typeof stateObj.rejectionReason === "string"
          ? stateObj.rejectionReason
          : undefined;
    } catch {
      // ignore
    }

    if (!submissionMap[key]) {
      submissionMap[key] = {
        bestScore: sub.score,
        attempts: 1,
        completed: sub.passed || sub.score === 100,
        isRejected,
        rejectionReason,
      };
    } else {
      submissionMap[key].attempts++;
      if (sub.score > submissionMap[key].bestScore) {
        submissionMap[key].bestScore = sub.score;
      }
      if (sub.passed || sub.score === 100) {
        submissionMap[key].completed = true;
      }
      // If the latest submission was rejected, mark the problem as rejected
      if (isRejected) {
        submissionMap[key].isRejected = true;
        submissionMap[key].rejectionReason = rejectionReason;
      }
    }
  }

  const problemSummaries = getProblemSummaries();

  return (
    <div className="min-h-full py-2">
      <CodeLabBrowserClient
        institute={institute}
        problems={problemSummaries}
        studentSeedPrefix={session.user.id}
        submissionMap={submissionMap}
      />
    </div>
  );
}
