"use client";

import React from "react";
import Editor from "@monaco-editor/react";
import { useCodeLabStore } from "../stores/codelab-store";
import { CodeLabLanguage } from "../utils/starter-code";

export function CodeEditor() {
  const language = useCodeLabStore((s) => s.language);
  const code = useCodeLabStore((s) => s.codeByLanguage[language] || "");
  const updateCode = useCodeLabStore((s) => s.updateCode);
  const setLanguage = useCodeLabStore((s) => s.setLanguage);

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as CodeLabLanguage);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-slate-700">
      <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 uppercase font-bold tracking-wider">Language:</label>
          <select 
            value={language}
            onChange={handleLanguageChange}
            className="bg-slate-900 text-slate-200 text-sm py-1 px-2 rounded border border-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node)</option>
            <option value="java">Java</option>
            <option value="c">C</option>
            <option value="cpp">C++</option>
            <option value="csharp">C#</option>
          </select>
        </div>
      </div>
      
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(val) => updateCode(val || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
}
