"use client";

import { useMemo, useState } from "react";
import { useLogicStore, LogicGateType } from "../stores/logic-store";
import { generateTruthTable, compareTruthTables } from "../utils/logic-solver";
import { useActivityStore } from "../../shared/stores/activity-store";
import SubmitBar from "../../shared/components/SubmitBar";
import { Table, Plus } from "lucide-react";

export interface TruthTableUIProps {
  assignmentId: string;
  studentId: string;
  variantSeed: string;
  startedAt: string;
}

export default function TruthTableUI({
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
}: TruthTableUIProps) {
  const { gates, wires, targetTruthTable, addGate } = useLogicStore();
  const { setScore, updateStateCheck, markComplete } = useActivityStore();
  
  const [showToolbox, setShowToolbox] = useState(false);

  // Auto-generate the live truth table based on current graph
  const liveTable = useMemo(() => {
    return generateTruthTable(gates, wires);
  }, [gates, wires]);

  // Compute live score
  const currentScore = useMemo(() => {
    if (!targetTruthTable) return 100; // Free build mode
    return compareTruthTables(liveTable, targetTruthTable);
  }, [liveTable, targetTruthTable]);

  // Sync score with activity store continuously so SubmitBar picks it up
  useState(() => {
    // Initial sync
    setScore(currentScore);
    updateStateCheck("truthTableMatchPercent", currentScore);
  });

  useMemo(() => {
    setScore(currentScore);
    updateStateCheck("truthTableMatchPercent", currentScore);
    const gateCount = Object.keys(gates).length;
    updateStateCheck("gateCount", gateCount);
    
    if (currentScore === 100) {
      markComplete(true);
    }
  }, [currentScore, gates, setScore, updateStateCheck, markComplete]);

  return (
    <>
      <div className="absolute top-0 right-0 h-full w-[400px] bg-slate-900 flex flex-col z-40 border-l border-slate-700 shadow-2xl text-slate-300">
        
        <div className="flex border-b border-slate-700 bg-slate-950 p-4 justify-between items-center">
          <h2 className="text-white font-bold flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-500" /> Truth Table Analysis
          </h2>
          {targetTruthTable && (
            <span className={`px-2 py-1 rounded text-xs font-bold ${currentScore === 100 ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
              {currentScore.toFixed(0)}% MATCH
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Target Table */}
          {targetTruthTable && (
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="bg-slate-950 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
                Target Objective
              </div>
              <table className="w-full text-center text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    {targetTruthTable.inputs.map(i => <th key={i} className="py-2 text-blue-400">{i}</th>)}
                    <th className="border-l border-slate-700 py-2 text-green-400">Target OUT</th>
                  </tr>
                </thead>
                <tbody>
                  {targetTruthTable.rows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-700/50 last:border-0 font-mono">
                      {r.in.map((val, j) => <td key={j} className="py-1">{val ? "1" : "0"}</td>)}
                      <td className="border-l border-slate-700 py-1 font-bold">{r.out[0] ? "1" : "0"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Live Table */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="bg-slate-950 px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-700">
              Live Circuit Analysis
            </div>
            {liveTable.rows.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                Place Inputs and Outputs on the board to generate a Truth Table.
              </div>
            ) : (
              <table className="w-full text-center text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-800/50">
                    {liveTable.inputs.map(i => <th key={i} className="py-2 text-blue-400">{i}</th>)}
                    {liveTable.outputs.map(o => <th key={o} className="border-l border-slate-700 py-2 text-orange-400">{o}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {liveTable.rows.map((r, i) => {
                    // Highlight rows that don't match target
                    const targetRow = targetTruthTable?.rows[i];
                    const isMismatch = targetRow && JSON.stringify(targetRow.out) !== JSON.stringify(r.out);
                    
                    return (
                      <tr key={i} className={`border-b border-slate-700/50 last:border-0 font-mono ${isMismatch ? 'bg-red-900/20' : ''}`}>
                        {r.in.map((val, j) => <td key={j} className="py-1 text-slate-400">{val ? "1" : "0"}</td>)}
                        {r.out.map((val, j) => <td key={j} className={`border-l border-slate-700 py-1 font-bold ${val ? "text-green-400" : "text-slate-500"}`}>{val ? "1" : "0"}</td>)}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
        </div>

        {/* Toolbox */}
        <div className="border-t border-slate-700 bg-slate-950 p-4">
          <button 
            onClick={() => setShowToolbox(!showToolbox)}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 mb-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Component
          </button>
          
          {showToolbox && (
            <div className="grid grid-cols-3 gap-2 mt-3">
              {["AND", "OR", "NOT", "XOR", "NAND", "NOR", "D_FF"].map(type => (
                <button 
                  key={type}
                  onClick={() => addGate(type as LogicGateType, [0, 0.5, 0])}
                  className="bg-slate-800 hover:bg-indigo-600 text-xs font-bold py-2 rounded transition-colors"
                >
                  {type.replace("_", "-")}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mr-[400px]">
        {/* We use manualGrading because the auto-grading is too rigid for the student. */}
        <SubmitBar 
          activityType="logic-gate"
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
