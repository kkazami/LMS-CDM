"use client";

import React from "react";
import { useCodeLabStore } from "../stores/codelab-store";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export function TestResultsUI() {
  const testResults = useCodeLabStore((s) => s.testResults);
  const testCases = useCodeLabStore((s) => s.testCases);
  const isExecuting = useCodeLabStore((s) => s.isExecuting);

  if (isExecuting) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p>Executing test cases...</p>
      </div>
    );
  }

  if (testResults.length === 0) {
    return (
      <div className="p-4 text-slate-500 text-sm text-center h-full flex items-center justify-center">
        Run your code to see test results.
      </div>
    );
  }

  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="flex flex-col h-full bg-[#0f172a] text-slate-300">
      <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-bold text-white">Test Results</h3>
        <span className={`px-2 py-1 rounded text-xs font-bold ${passedCount === totalCount ? 'bg-green-600/20 text-green-400' : 'bg-orange-600/20 text-orange-400'}`}>
          {passedCount} / {totalCount} Passed
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {testResults.map((res, i) => {
          const tc = testCases[i];
          return (
            <div key={i} className={`p-3 rounded border ${res.passed ? 'bg-green-950/20 border-green-900/50' : 'bg-red-950/20 border-red-900/50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {res.passed ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                <span className="font-bold text-sm text-slate-200">
                  Test Case {i + 1} {tc.isHidden ? "(Hidden)" : ""}
                </span>
                {res.time && (
                  <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {res.time}s
                  </span>
                )}
              </div>
              
              {!tc.isHidden && (
                <div className="space-y-1 mt-2 text-xs font-mono bg-slate-900/50 p-2 rounded">
                  <div className="flex text-slate-400">
                    <span className="w-16">Input:</span>
                    <span className="text-slate-300">{tc.input}</span>
                  </div>
                  <div className="flex text-slate-400">
                    <span className="w-16">Expected:</span>
                    <span className="text-slate-300">{tc.expectedOutput}</span>
                  </div>
                  <div className="flex text-slate-400">
                    <span className="w-16">Output:</span>
                    <span className={res.passed ? "text-green-400" : "text-red-400"}>{res.actualOutput !== null ? res.actualOutput : "N/A"}</span>
                  </div>
                </div>
              )}
              
              {res.error && (
                <div className="mt-2 text-xs text-red-400 bg-red-950/30 p-2 rounded whitespace-pre-wrap font-mono">
                  {res.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
