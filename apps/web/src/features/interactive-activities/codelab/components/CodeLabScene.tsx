"use client";

import React, { useEffect } from "react";
import { CodeEditor } from "./CodeEditor";
import { TestResultsUI } from "./TestResultsUI";
import { useCodeLabStore, TestCase } from "../stores/codelab-store";
import { FuncSignature, JUDGE0_LANGUAGE_IDS } from "../utils/starter-code";
import { submitToJudge0 } from "../utils/judge0-client";
import { categorizeFeedback } from "../utils/feedback-matcher";
import { useActivityStore } from "../../shared/stores/activity-store";
import SubmitBar from "../../shared/components/SubmitBar";
import { Terminal, Play, CheckCircle } from "lucide-react";

interface CodeLabSceneProps {
  assignmentId: string;
  studentId: string;
  variantSeed: string;
  startedAt: string;
  descriptionMarkdown: string;
  signature: FuncSignature;
  testCases: TestCase[];
}

export default function CodeLabScene({
  assignmentId,
  studentId,
  variantSeed,
  startedAt,
  descriptionMarkdown,
  signature,
  testCases,
}: CodeLabSceneProps) {
  const initialize = useCodeLabStore(s => s.initialize);
  const { 
    language, 
    codeByLanguage, 
    activeTab, 
    setActiveTab, 
    setExecuting, 
    isExecuting,
    setConsoleOutput,
    consoleOutput,
    setTestResults
  } = useCodeLabStore();
  
  const { setScore, updateStateCheck, markComplete } = useActivityStore();

  useEffect(() => {
    initialize("python", signature, testCases);
  }, [initialize, signature, testCases]);

  const handleRun = async () => {
    if (isExecuting) return;
    
    setExecuting(true);
    setActiveTab("console");
    setConsoleOutput(null);

    const code = codeByLanguage[language];
    const langId = JUDGE0_LANGUAGE_IDS[language];

    try {
      // Basic run against a dummy input or just to check syntax
      const res = await submitToJudge0(code, langId, "");
      
      const hints = categorizeFeedback(res.stderr || "", res.status?.id || 0);
      res.errorLog = hints;
      setConsoleOutput(res);
      
    } catch (err: any) {
      setConsoleOutput({
        stdout: null,
        stderr: err.message || "Failed to execute",
        compile_output: null,
        time: "0",
        memory: 0,
        status: { id: 13, description: "Internal Error" },
        errorLog: [err.message]
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleTest = async () => {
    if (isExecuting) return;
    
    setExecuting(true);
    setActiveTab("tests");
    
    const code = codeByLanguage[language];
    const langId = JUDGE0_LANGUAGE_IDS[language];
    
    const results = [];
    let passCount = 0;

    for (const tc of testCases) {
      try {
        // Here we ideally wrap the function call in a main block depending on language,
        // but for Judge0, standard IO is often easiest. We pass tc.input as stdin.
        // We assume the student's code reads from stdin or we injected a runner wrapper in the backend.
        // For this frontend-driven MVP, we submit raw code + stdin.
        const res = await submitToJudge0(code, langId, tc.input);
        
        const actualOut = (res.stdout || "").trim();
        const expectedOut = tc.expectedOutput.trim();
        const passed = res.status.id === 3 && actualOut === expectedOut;
        
        if (passed) passCount++;

        results.push({
          passed,
          actualOutput: actualOut,
          error: res.stderr || res.compile_output || (res.status.id !== 3 ? res.status.description : undefined),
          time: res.time
        });
      } catch (err: any) {
        results.push({
          passed: false,
          actualOutput: null,
          error: err.message
        });
      }
    }

    setTestResults(results);
    setExecuting(false);

    // Update grade
    const currentScore = Math.round((passCount / testCases.length) * 100);
    setScore(currentScore);
    updateStateCheck("language", language);
    updateStateCheck("testPassCount", passCount);
    
    if (currentScore === 100) {
      markComplete(true);
    }
  };

  return (
    <div className="flex h-full w-full bg-[#0f172a] overflow-hidden flex-col">
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Problem Description */}
        <div className="w-1/3 bg-slate-900 border-r border-slate-700 overflow-y-auto p-6 text-slate-300">
          <h2 className="text-white mt-0 mb-4 font-bold text-lg">Problem Description</h2>
          <div 
            className="space-y-4 text-sm leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: descriptionMarkdown }} 
          />
        </div>

        {/* Middle Panel: Code Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1">
            <CodeEditor />
          </div>
        </div>

        {/* Right Panel: Output & Tests */}
        <div className="w-1/3 flex flex-col bg-slate-900 border-l border-slate-700">
          <div className="flex border-b border-slate-700 bg-slate-950">
            <button 
              onClick={() => setActiveTab("console")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'console' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <Terminal className="w-4 h-4" /> Console
            </button>
            <button 
              onClick={() => setActiveTab("tests")}
              className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'tests' ? 'text-green-400 border-b-2 border-green-500 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
            >
              <CheckCircle className="w-4 h-4" /> Test Cases
            </button>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {activeTab === "console" ? (
              <div className="h-full p-4 font-mono text-sm overflow-y-auto">
                {!consoleOutput && !isExecuting && (
                  <span className="text-slate-500">Run your code to see output...</span>
                )}
                {isExecuting && (
                  <span className="text-indigo-400 animate-pulse">Running...</span>
                )}
                {consoleOutput && (
                  <div className="space-y-4">
                    {consoleOutput.status.id !== 3 && (
                      <div className="text-red-400 font-bold">Status: {consoleOutput.status.description}</div>
                    )}
                    {consoleOutput.errorLog && consoleOutput.errorLog.length > 0 && (
                      <div className="bg-red-950/30 p-3 rounded border border-red-900/50 text-red-300">
                        <strong>Hints:</strong>
                        <ul className="list-disc ml-4 mt-2">
                          {consoleOutput.errorLog.map((h, i) => <li key={i}>{h}</li>)}
                        </ul>
                      </div>
                    )}
                    {consoleOutput.stdout && (
                      <div>
                        <div className="text-slate-500 text-xs uppercase mb-1">Standard Output</div>
                        <pre className="text-slate-300 whitespace-pre-wrap">{consoleOutput.stdout}</pre>
                      </div>
                    )}
                    {consoleOutput.stderr && (
                      <div>
                        <div className="text-slate-500 text-xs uppercase mb-1">Standard Error</div>
                        <pre className="text-red-400 whitespace-pre-wrap">{consoleOutput.stderr}</pre>
                      </div>
                    )}
                    {consoleOutput.compile_output && (
                      <div>
                        <div className="text-slate-500 text-xs uppercase mb-1">Compiler Output</div>
                        <pre className="text-orange-400 whitespace-pre-wrap">{consoleOutput.compile_output}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <TestResultsUI />
            )}
          </div>
          
          <div className="p-4 border-t border-slate-700 bg-slate-950 flex gap-3">
            <button
              onClick={handleRun}
              disabled={isExecuting}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Terminal className="w-4 h-4" /> Run Code
            </button>
            <button
              onClick={handleTest}
              disabled={isExecuting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> Run Tests
            </button>
          </div>
        </div>

      </div>

      <div className="flex-none">
        <SubmitBar 
          activityType="codelab"
          assignmentId={assignmentId}
          studentId={studentId}
          variantSeed={variantSeed}
          startedAt={startedAt}
          maxScore={100}
        />
      </div>
    </div>
  );
}
