/**
 * Student PC Build Execution Route
 * Route: /[institute]/activities/pc-build/[templateId]/[seed]
 */

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import PCBuilderUI from "@/features/interactive-activities/pc-build/components/PCBuilderUI";
import { PCMode } from "@/features/interactive-activities/pc-build/stores/pc-build-store";
import PCBuilderActivityClient from "@/features/interactive-activities/pc-build/components/PCBuilderActivityClient";
import { getSession } from "@/lib/auth-session";
import { injectFaults } from "@/features/interactive-activities/pc-build/utils/fault-engine";

export default async function PCBuildActivityPage({
  params,
}: {
  params: Promise<{ institute: string; templateId: string; seed: string }>;
}) {
  const { templateId, seed } = await params;
  const session = await getSession();

  if (!session) {
    // Rely on the layout's redirect, but fail safe here
    throw new Error("Unauthorized");
  }

  // Fetch the template
  const template = await db.activityTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || template.activityType !== "pc-build") {
    notFound();
  }

  // Parse faults and determine mode
  const faultPool = JSON.parse(template.faultPool || "[]") as string[];
  
  // A template with an empty fault pool implies pure Assembly Mode.
  // Otherwise, it's Troubleshooting Mode with injected faults.
  const isTroubleshooting = faultPool.length > 0;
  const mode: PCMode = isTroubleshooting ? "TROUBLESHOOTING" : "ASSEMBLY";
  
  // Inject faults deterministically using the variant seed and difficulty level
  const injectedFaults = isTroubleshooting 
    ? injectFaults(seed, faultPool, template.difficulty) 
    : [];

  return (
    <div className="-m-4 lg:-m-8 flex flex-col w-full bg-slate-50 relative overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
      {/* 3D Scene / 2D Fallback */}
      <div className="flex-1 w-full h-full">
        <PCBuilderActivityClient mode={mode} injectedFaults={injectedFaults} />
      </div>

      {/* 2D Overlay UI (Score, Power Button, Submission) */}
      <PCBuilderUI 
        assignmentId={template.id}
        studentId={session.user.id}
        variantSeed={seed}
        startedAt={new Date().toISOString()}
      />
      
    </div>
  );
}
