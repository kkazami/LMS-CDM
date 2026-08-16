"use client";

import React, { useState } from "react";
import { useCodeLabStore } from "../stores/codelab-store";
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  EyeOff,
  Zap,
} from "lucide-react";

export function TestResultsUI() {
  const testResults = useCodeLabStore((s) => s.testResults);
  const testCases = useCodeLabStore((s) => s.testCases);
  const isExecuting = useCodeLabStore((s) => s.isExecuting);
  const [expandedTests, setExpandedTests] = useState<Set<number>>(new Set());

  const toggleTest = (index: number) => {
    setExpandedTests((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (isExecuting) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 gap-4 bg-white dark:bg-[#0a0e1a]">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-orange-500/20 rounded-full" />
          <div className="absolute inset-0 w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-orange-600 dark:text-orange-400">Evaluating test cases...</p>
          <p className="text-[11px] text-slate-400 mt-1">Executing Judge0 sandbox compilation</p>
        </div>
      </div>
    );
  }

  if (testResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 gap-3 bg-white dark:bg-[#0a0e1a]">
        <Zap className="w-8 h-8 text-slate-300 dark:text-slate-700" />
        <div className="text-center">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No test results yet</p>
          <p className="text-[11px] text-slate-400 mt-1">
            Click &quot;Run&quot; or &quot;Submit Solution&quot; to test your code
          </p>
        </div>
      </div>
    );
  }

  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;
  const allPassed = passedCount === totalCount;
  const progressPercent = totalCount > 0 ? (passedCount / totalCount) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0e1a] text-slate-800 dark:text-slate-300">
      {/* ──── Summary Header ──── */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-[#0d1117] border-b border-slate-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Evaluation Results
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
              allPassed
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                : "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
            }`}
          >
            {passedCount}/{totalCount} Passed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              allPassed ? "bg-emerald-500" : "bg-orange-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* ──── Test Case List ──── */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2">
        {testResults.map((result, idx) => {
          const tc = testCases[idx];
          const isExpanded = expandedTests.has(idx);
          const isHidden = tc?.isHidden;

          return (
            <div
              key={idx}
              className={`rounded-xl border transition-all text-xs ${
                result.passed
                  ? "bg-emerald-50/40 border-emerald-200 dark:bg-emerald-950/15 dark:border-emerald-500/20"
                  : "bg-rose-50/40 border-rose-200 dark:bg-rose-950/15 dark:border-rose-500/20"
              }`}
            >
              {/* Header */}
              <button
                onClick={() => toggleTest(idx)}
                className="w-full flex items-center justify-between p-3 text-left cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/30 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {result.passed ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Test Case {idx + 1}
                  </span>
                  {isHidden && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      <EyeOff className="w-3 h-3" /> Hidden
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {result.time && (
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {result.time}s
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Collapsible Details */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-slate-200/60 dark:border-slate-800/60 pt-2 animate-in fade-in duration-150">
                  {isHidden ? (
                    <p className="text-slate-400 italic text-[11px]">
                      This is a hidden test case. Input and expected output are hidden to ensure independent logic.
                    </p>
                  ) : (
                    <>
                      {/* Input */}
                      {tc?.input && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Input</div>
                          <pre className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto border border-slate-200 dark:border-slate-800">
                            {tc.input}
                          </pre>
                        </div>
                      )}

                      {/* Expected */}
                      {tc?.expectedOutput && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Expected Output</div>
                          <pre className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto border border-slate-200 dark:border-slate-800">
                            {tc.expectedOutput}
                          </pre>
                        </div>
                      )}

                      {/* Actual */}
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Your Output</div>
                        <pre className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 font-mono text-[11px] text-slate-800 dark:text-slate-200 overflow-x-auto border border-slate-200 dark:border-slate-800">
                          {result.actualOutput || "(No output)"}
                        </pre>
                      </div>

                      {/* Error */}
                      {result.error && (
                        <div>
                          <div className="text-[10px] uppercase font-bold text-rose-500 mb-0.5">Runtime Error</div>
                          <pre className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-mono text-[11px] overflow-x-auto border border-rose-200 dark:border-rose-500/30">
                            {result.error}
                          </pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
