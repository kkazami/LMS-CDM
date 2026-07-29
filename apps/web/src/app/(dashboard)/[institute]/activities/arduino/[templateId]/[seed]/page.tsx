/**
 * Student Arduino Execution Route
 * Route: /[institute]/activities/arduino/[templateId]/[seed]
 */

import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { injectFaults } from "@/features/interactive-activities/arduino/utils/fault-engine";
import ArduinoScene from "@/features/interactive-activities/arduino/components/ArduinoScene";
import ArduinoUI from "@/features/interactive-activities/arduino/components/ArduinoUI";

export default async function ArduinoActivityPage({
  params,
}: {
  params: Promise<{ institute: string; templateId: string; seed: string }>;
}) {
  const { templateId, seed } = await params;
  const session = await getSession();

  if (!session) throw new Error("Unauthorized");

  const template = await db.activityTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template || template.activityType !== "arduino") {
    notFound();
  }

  const faultPool = JSON.parse(template.faultPool || "[]") as string[];
  const variables = JSON.parse(template.variables as string || "{}");
  const isTroubleshooting = faultPool.length > 0;
  
  const injectedFaults = isTroubleshooting 
    ? injectFaults(seed, faultPool, template.difficulty) 
    : [];

  // If the WRONG_PIN fault is injected, alter the starter code
  let starterCode = variables.starterCode || "";
  if (injectedFaults.includes("WRONG_PIN_IN_CODE")) {
    starterCode = starterCode.replace(/13/g, "12");
  }

  return (
    <div className="-m-4 lg:-m-8 flex h-full w-full bg-[#1e293b] relative overflow-hidden" style={{ height: "calc(100vh - 73px)" }}>
      
      {/* 3D Scene */}
      <div className="flex-1 h-full relative z-10 mr-[450px]">
        {/* Standardized Activity Guide */}
        <div className="absolute top-6 left-6 z-20 bg-white/95 backdrop-blur text-slate-800 p-5 rounded-2xl border border-slate-200 shadow-xl max-w-sm pointer-events-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-100 p-1.5 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Activity Guide</h3>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Controls</h4>
              <ul className="text-sm space-y-2 text-slate-600">
                <li className="flex items-start gap-2">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-500">Click</kbd>
                  <span>Connect wires between breadboard/Arduino pins</span>
                </li>
                <li className="flex items-start gap-2">
                  <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono text-slate-500">Ctrl+Z</kbd>
                  <span>Undo last wiring action (Ctrl+Y to Redo)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <ArduinoScene faults={injectedFaults} />
      </div>

      {/* 2D Overlay UI (Monaco, Serial, Submit) */}
      <ArduinoUI 
        assignmentId={template.id}
        studentId={session.user.id}
        variantSeed={seed}
        startedAt={new Date().toISOString()}
        initialCode={starterCode}
      />
      
    </div>
  );
}
