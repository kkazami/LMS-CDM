"use client";

import { useState, useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useArduinoStore } from "../stores/arduino-store";
import { arduinoSim } from "../utils/interpreter";
import { useActivityStore } from "../../shared/stores/activity-store";
import SubmitBar from "../../shared/components/SubmitBar";
import { Play, Square, Terminal } from "lucide-react";

export interface ArduinoUIProps {
  assignmentId: string;
  studentId: string;
  variantSeed: string;
  startedAt: string;
  initialCode: string;
}

export default function ArduinoUI({
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
  initialCode,
}: ArduinoUIProps) {
  const [code, setCode] = useState(initialCode);
  const { isRunning, serialOutput, components, wiringState, cancelWiring } = useArduinoStore();
  const { setScore, updateStateCheck, markComplete } = useActivityStore();
  const serialRef = useRef<HTMLDivElement>(null);

  // Auto-scroll serial monitor
  useEffect(() => {
    if (serialRef.current) {
      serialRef.current.scrollTop = serialRef.current.scrollHeight;
    }
  }, [serialOutput]);

  const handleToggleSim = () => {
    if (isRunning) {
      arduinoSim.stop();
      // Evaluate grading upon stop
      const led = components["led1"];
      if (led && led.isOn) { // Note: this is rudimentary. Real grading might check a time-series history of states.
        updateStateCheck("ledSuccessfullyLit", true);
        setScore(100);
        markComplete(true);
      } else {
        updateStateCheck("ledSuccessfullyLit", false);
        setScore(0);
      }
    } else {
      // Evaluate grading payload before running to reset it
      updateStateCheck("ledSuccessfullyLit", false);
      arduinoSim.run(code);
    }
  };

  return (
    <>
      {/* Active Wiring Hint overlay */}
      {wiringState.active && (
        <div className="absolute top-6 left-6 z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg animate-pulse flex items-center gap-2">
          <span>Click a destination socket to connect wire.</span>
          <button onClick={cancelWiring} className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs font-bold transition-colors">Cancel</button>
        </div>
      )}

      {/* Editor & Serial Monitor Panel (Right Side) */}
      <div className="absolute top-0 right-0 h-full w-[450px] bg-[#1e1e1e] flex flex-col z-40 border-l border-slate-700 shadow-2xl">
        
        {/* Editor Toolbar */}
        <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4 bg-[#252526]">
          <span className="text-slate-300 font-mono text-sm font-semibold">sketch.ino</span>
          <button
            onClick={handleToggleSim}
            className={`flex items-center gap-2 px-4 py-1.5 rounded font-bold text-sm transition-colors ${
              isRunning ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isRunning ? <><Square className="w-4 h-4 fill-current" /> Stop</> : <><Play className="w-4 h-4 fill-current" /> Run</>}
          </button>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 relative">
          <Editor
            height="100%"
            defaultLanguage="cpp"
            theme="vs-dark"
            value={code}
            onChange={(v) => setCode(v || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              readOnly: isRunning,
              scrollBeyondLastLine: false,
            }}
          />
        </div>

        {/* Serial Monitor */}
        <div className="h-48 border-t border-slate-700 bg-[#000000] flex flex-col">
          <div className="h-8 border-b border-slate-800 flex items-center px-3 bg-[#111111]">
            <Terminal className="w-4 h-4 text-slate-400 mr-2" />
            <span className="text-xs font-mono text-slate-400">Serial Monitor</span>
          </div>
          <div ref={serialRef} className="flex-1 overflow-y-auto p-3 font-mono text-xs text-green-400 whitespace-pre-wrap">
            {serialOutput.length === 0 ? (
              <span className="text-slate-600 italic">No output...</span>
            ) : (
              serialOutput.map((line, i) => <div key={i}>{line}</div>)
            )}
          </div>
        </div>
      </div>

      {/* Shared Submit Bar - positioned to the left of the editor */}
      <div className="mr-[450px]">
        <SubmitBar 
          activityType="arduino"
          assignmentId={assignmentId}
          studentId={studentId}
          variantSeed={variantSeed}
          startedAt={startedAt}
          maxScore={100}
          manualGrading={true}
        />
      </div>
    </>
  );
}
