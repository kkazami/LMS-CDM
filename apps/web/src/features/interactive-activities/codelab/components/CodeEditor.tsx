"use client";

import React, { useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useCodeLabStore } from "../stores/codelab-store";
import { CodeLabLanguage } from "../utils/starter-code";
import { AlertTriangle, Code2 } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { LANGUAGE_LABELS } from "../problems/types";

/** Maps our language keys to Monaco editor language identifiers. */
const MONACO_LANGUAGE_MAP: Record<CodeLabLanguage, string> = {
  python: "python",
  java: "java",
  c: "c",
  cpp: "cpp",
  javascript: "javascript",
  csharp: "csharp",
  sql: "sql",
  html: "html",
  css: "css",
};

export function CodeEditor() {
  const language = useCodeLabStore((s) => s.language);
  const code = useCodeLabStore((s) => s.codeByLanguage[language] || "");
  const updateCode = useCodeLabStore((s) => s.updateCode);
  const pasteCount = useCodeLabStore((s) => s.pasteCount);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { themeMode } = useTheme();

  const handleEditorMount: OnMount = (editor) => {
    // Disable the built-in context menu to reduce right-click confusion
    editor.updateOptions({ contextmenu: false });

    // In-editor paste detection (forensic — never blocks the student)
    editor.onDidPaste((e) => {
      const store = useCodeLabStore.getState();
      store.incrementPasteCount();
      store.addPasteEvent({
        timestamp: new Date().toISOString(),
        charCount: e.range?.endColumn ? (e.range.endColumn - e.range.startColumn) : 1,
        language: store.language,
      });
    });

    // Keystroke velocity tracking (fingerprint)
    editor.onDidChangeModelContent((e) => {
      const addedChars = e.changes.reduce((sum, c) => sum + c.text.length, 0);
      if (addedChars > 0) {
        useCodeLabStore.getState().incrementTypedChars(addedChars);
      }
    });
  };

  const displayLanguage = (LANGUAGE_LABELS as Record<string, string>)[language] || language.toUpperCase();

  return (
    <div ref={editorContainerRef} className="flex flex-col h-full bg-white dark:bg-[#1e1e1e]">
      {/* Subtle paste warning banner */}
      {pasteCount >= 1 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Paste detected — your instructor may review your keystroke history.</span>
        </div>
      )}

      {/* Editor Header: Fixed Track Indicator */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-[#161b22] border-b border-slate-200 dark:border-slate-800 flex-none">
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
            {displayLanguage}
          </span>
        </div>

        <div className="text-[11px] text-slate-400 font-mono font-medium">
          {code.split("\n").length} lines
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language] || "python"}
          value={code}
          theme={themeMode === "dark" ? "vs-dark" : "vs"}
          onChange={(newCode) => updateCode(newCode || "")}
          onMount={handleEditorMount}
          options={{
            fontSize: 14,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            cursorSmoothCaretAnimation: "on",
            renderLineHighlight: "all",
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            automaticLayout: true,
            bracketPairColorization: { enabled: true },
            suggest: { showKeywords: true, showSnippets: true },
            tabSize: 4,
            insertSpaces: true,
          }}
        />
      </div>
    </div>
  );
}
