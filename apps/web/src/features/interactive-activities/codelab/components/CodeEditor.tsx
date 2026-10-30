"use client";

import React, { useEffect, useRef, useState } from "react";
import type { OnMount } from "@monaco-editor/react";
import dynamic from 'next/dynamic';
import { useCodeLabStore } from "../stores/codelab-store";
import { CodeLabLanguage } from "../utils/starter-code";
import { AlertTriangle, Code2 } from "lucide-react";
import { useTheme } from "@/lib/theme-context";
import { LANGUAGE_LABELS } from "../problems/types";
import MonacoInit from "@/components/common/MonacoInit";
import { CodeSymbolBar } from './CodeSymbolBar';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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
  const touchInput = useRef<HTMLTextAreaElement>(null);
  const { themeMode } = useTheme();
  const [touchEditor, setTouchEditor] = useState(true);
  const previousCode = useRef(code);
  useEffect(() => { previousCode.current = code; }, [code]);

  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse), (max-width: 767px)');
    const update = () => setTouchEditor(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

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
      {!touchEditor && <MonacoInit />}
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

      <div className="flex flex-1 min-h-0 flex-col">
        {touchEditor ? <textarea
          ref={touchInput}
          aria-label={`${displayLanguage} code editor`}
          value={code}
          onChange={event => {
            const value = event.target.value;
            const added = value.length - previousCode.current.length;
            if (added > 0) useCodeLabStore.getState().incrementTypedChars(added);
            previousCode.current = value;
            updateCode(value);
          }}
          onPaste={event => {
            const store = useCodeLabStore.getState();
            store.incrementPasteCount();
            store.addPasteEvent({ timestamp: new Date().toISOString(), charCount: event.clipboardData.getData('text').length, language });
          }}
          autoCapitalize="off" autoCorrect="off" spellCheck={false}
          className="block h-full min-h-32 w-full resize-none rounded-none border-0 bg-white p-4 font-mono text-base leading-7 text-slate-900 outline-offset-[-2px] dark:bg-[#1e1e1e] dark:text-slate-100"
        /> : <Editor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language] || "python"}
          value={code}
          theme={themeMode === "dark" ? "vs-dark" : "vs"}
          onChange={(newCode?: string) => updateCode(newCode || "")}
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
        />}
        {touchEditor && <CodeSymbolBar editor={touchInput} value={code} onChange={updateCode} />}
      </div>
    </div>
  );
}
