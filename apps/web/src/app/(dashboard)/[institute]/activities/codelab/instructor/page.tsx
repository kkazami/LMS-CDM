/**
 * CodeLab Instructor Analytics & Monitoring Page
 * Route: /[institute]/activities/codelab/instructor
 *
 * Provides class overview, telemetry review (paste/velocity flags),
 * and per-problem performance heatmap.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isEligibleForActivities, isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { db } from "@/lib/db";
import { getProblemById, getProblemSummaries } from "@/features/interactive-activities/codelab/problems";
import {
  CodeLabInstructorClient,
  InstructorSubmissionRecord,
} from "@/features/interactive-activities/codelab/components/CodeLabInstructorClient";

export default async function CodeLabInstructorPage({
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

  // 2. Fetch all student CodeLab submissions
  const rawSubmissions = await db.activitySubmission.findMany({
    where: {
      activityType: "codelab",
    },
    include: {
      student: {
        select: {
          name: true,
          studentNumber: true,
        },
      },
    },
    orderBy: {
      submittedAt: "desc",
    },
  });

  // 3. Parse stateCheck for forensic integrity flags
  const submissions: InstructorSubmissionRecord[] = rawSubmissions.map((sub) => {
    let pasteCount = 0;
    let typingVelocityCpm = 0;
    let language = "python";

    let isRejected = false;
    let rejectionReason: string | undefined = undefined;

    try {
      const stateObj = JSON.parse(sub.stateCheck || "{}");
      pasteCount = typeof stateObj.pasteCount === "number" ? stateObj.pasteCount : 0;
      typingVelocityCpm =
        typeof stateObj.typingVelocityCharsPerMin === "number"
          ? stateObj.typingVelocityCharsPerMin
          : 0;
      language = typeof stateObj.language === "string" ? stateObj.language : "python";
      isRejected = Boolean(stateObj.isRejected);
      rejectionReason = typeof stateObj.rejectionReason === "string" ? stateObj.rejectionReason : undefined;
    } catch {
      // ignore parse errors
    }

    const flagReasons: string[] = [];
    if (pasteCount > 0) {
      flagReasons.push(`Paste detected (${pasteCount}x)`);
    }
    if (typingVelocityCpm > 800) {
      flagReasons.push(`High typing velocity (${typingVelocityCpm} cpm)`);
    }

    const problem = getProblemById(sub.templateId);
    const problemTitle = problem ? problem.title : sub.templateId;

    return {
      id: sub.id,
      studentId: sub.studentId,
      studentName: sub.student?.name || "Student",
      studentNumber: sub.student?.studentNumber || null,
      templateId: sub.templateId,
      problemTitle,
      language,
      score: sub.score,
      attempts: sub.attempts,
      passed: sub.passed || sub.score === 100,
      completionTimeSeconds: sub.completionTimeSeconds,
      submittedAt: sub.submittedAt.toISOString(),
      pasteCount,
      typingVelocityCpm,
      isFlagged: flagReasons.length > 0,
      flagReasons,
      isRejected,
      rejectionReason,
    };
  });

  const problemSummaries = getProblemSummaries();

  return (
    <div className="min-h-full py-2">
      <CodeLabInstructorClient
        institute={institute}
        problems={problemSummaries}
        submissions={submissions}
      />
    </div>
  );
}
