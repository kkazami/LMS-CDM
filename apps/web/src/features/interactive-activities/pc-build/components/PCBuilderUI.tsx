"use client";

import { usePCBuildStore } from "../stores/pc-build-store";
import { useActivityStore } from "../../shared/stores/activity-store";
import { evaluateBoot } from "../utils/boot-logic";
import SubmitBar from "../../shared/components/SubmitBar";
import { Power, AlertTriangle, Info, MousePointer2, Keyboard, CheckCircle2 } from "lucide-react";

export interface PCBuilderUIProps {
  assignmentId: string;
  studentId: string;
  variantSeed: string;
  startedAt: string;
}

export default function PCBuilderUI({
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
}: PCBuilderUIProps) {
  const { mode, toastMessage, bootState, setBootState } = usePCBuildStore();
  const { setScore, updateStateCheck, isComplete, markComplete } = useActivityStore();

  const handlePowerOn = () => {
    const result = evaluateBoot();
    setBootState(result.state);
    
    // Update global activity state payload
    Object.entries(result.stateCheck).forEach(([key, val]) => {
      updateStateCheck(key, val);
    });

    if (result.state === "POST_SUCCESS") {
      setScore(100);
      markComplete(true);
    } else {
      setScore(0);
    }
  };

  // Human-readable boot symptoms
  const bootMessages: Record<string, string> = {
    "ERR_NO_POWER": "No response. The system isn't receiving power.",
    "ERR_CPU_POWER": "Fans spin for 1s, then die. CPU LED glows red.",
    "ERR_TEMP": "System boots, then immediately shuts down (thermal trip).",
    "ERR_RAM": "3 Long Beeps. Memory initialization error.",
    "ERR_GPU": "1 Long Beep, 2 Short Beeps. VGA error / No display.",
    "POST_SUCCESS": "Beep. POST successful! OS loading...",
  };

  return (
    <>
      {/* Toast Messages for Non-fatal Assembly Errors */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 max-w-sm w-full pointer-events-none animate-in slide-in-from-top-4">
          <Info className="w-5 h-5 text-blue-400 shrink-0" />
          <p className="text-sm">{toastMessage}</p>
        </div>
      )}

      {/* Controls & Objectives Guide */}
      <div className="absolute top-20 left-6 z-40 bg-white/95 backdrop-blur shadow-xl border border-slate-200 rounded-xl w-80 overflow-hidden">
        <div className="bg-indigo-600 px-4 py-3 text-white">
          <h3 className="font-bold flex items-center gap-2">
            <Info className="w-4 h-4" />
            Activity Guide
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Controls</h4>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <MousePointer2 className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                <p><strong>Mouse:</strong> Click and drag parts to their matching glowing sockets. (Scroll to zoom, Right-click to pan).</p>
              </div>
              <div className="flex items-start gap-2">
                <Keyboard className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                <p><strong>Keyboard:</strong> Click a part to select it (turns yellow), use <kbd className="bg-slate-100 border px-1 rounded text-xs">W</kbd><kbd className="bg-slate-100 border px-1 rounded text-xs mx-0.5">A</kbd><kbd className="bg-slate-100 border px-1 rounded text-xs">S</kbd><kbd className="bg-slate-100 border px-1 rounded text-xs mx-0.5">D</kbd> or arrows to move, and <kbd className="bg-slate-100 border px-1 rounded text-xs">Enter</kbd> to drop into a socket.</p>
              </div>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Checklist</h4>
            <ul className="text-sm space-y-1 text-slate-700">
              <li className="flex items-center gap-2"><CheckCircle2 className={`w-4 h-4 ${mode === "TROUBLESHOOTING" ? "text-green-500" : "text-slate-300"}`} /> Build the PC</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-300" /> Click Power On</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Boot Status Overlay */}
      {bootState !== "OFF" && (
        <div className="absolute top-6 left-6 z-50 bg-white/95 backdrop-blur-sm border-2 border-indigo-500 shadow-xl rounded-xl p-4 w-80 animate-in fade-in zoom-in">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
            {bootState === "POST_SUCCESS" ? "🖥️ Boot Sequence" : "⚠️ Diagnostic Output"}
          </h3>
          <p className={`text-sm ${bootState === "POST_SUCCESS" ? "text-green-700" : "text-red-600 font-medium"}`}>
            {bootMessages[bootState] || "Unknown error."}
          </p>
        </div>
      )}

      {/* Mode Indicator & Power Button */}
      <div className="absolute top-6 right-6 z-40 flex flex-col gap-3 items-end">
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 shadow border border-slate-200">
          {mode === "ASSEMBLY" ? "Assembly Mode" : "Troubleshooting Mode"}
        </div>
        
        <button
          onClick={handlePowerOn}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold shadow-lg transition-colors"
        >
          <Power className="w-4 h-4" />
          Power On
        </button>
      </div>

      {/* Shared Submit Bar */}
      <SubmitBar 
        activityType="pc-build"
        assignmentId={assignmentId}
        studentId={studentId}
        variantSeed={variantSeed}
        startedAt={startedAt}
        maxScore={100}
        manualGrading={true}
      />
    </>
  );
}
