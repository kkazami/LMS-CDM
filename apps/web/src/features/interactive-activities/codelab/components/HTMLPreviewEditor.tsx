"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import type { OnMount } from "@monaco-editor/react";
import dynamic from 'next/dynamic';
import { useTheme } from "@/lib/theme-context";
import { useCodeLabStore } from "../stores/codelab-store";
import { Play, Eye, Code2 } from "lucide-react";
import MonacoInit from "@/components/common/MonacoInit";
import { CodeSymbolBar } from './CodeSymbolBar';

const Editor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface HTMLPreviewEditorProps {
  initialCode: string;
  language: "html" | "css";
  /** For CSS track: the HTML template to apply the CSS to */
  htmlTemplate?: string;
  onChange: (code: string) => void;
}

export default function HTMLPreviewEditor({
  initialCode,
  language,
  htmlTemplate,
  onChange,
}: HTMLPreviewEditorProps) {
  const [code, setCode] = useState<string>(initialCode);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const touchInput = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setCode(initialCode); }, [initialCode]);
  const { themeMode } = useTheme();
  const [touchEditor, setTouchEditor] = useState(true);
  const [mobileView, setMobileView] = useState<'code' | 'preview'>('code');
  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse), (max-width: 767px)');
    const update = () => setTouchEditor(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Helper to compile srcdoc
  const buildSrcDoc = (currentCode: string): string => {
    if (language === "html") {
      return currentCode;
    }
    // CSS track: inject student's CSS into htmlTemplate
    const base = htmlTemplate || `<!DOCTYPE html><html><head></head><body><div class="box">Sample</div></body></html>`;
    if (base.includes("</head>")) {
      return base.replace("</head>", `<style>${currentCode}</style></head>`);
    }
    return `<!DOCTYPE html><html><head><style>${currentCode}</style></head><body>${base}</body></html>`;
  };

  // Debounced live preview update
  useEffect(() => {
    const timer = setTimeout(() => {
      if (iframeRef.current) {
        iframeRef.current.srcdoc = buildSrcDoc(code);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [code, language, htmlTemplate]);

  function handleChange(value: string | undefined) {
    const newCode = value ?? "";
    setCode(newCode);
    onChange(newCode);
  }

  const handleEditorMount: OnMount = (editor) => {
    editor.updateOptions({ contextmenu: false });

    editor.onDidPaste((e) => {
      const store = useCodeLabStore.getState();
      store.incrementPasteCount();
      store.addPasteEvent({
        timestamp: new Date().toISOString(),
        charCount: e.range?.endColumn ? (e.range.endColumn - e.range.startColumn) : 1,
        language: store.language,
      });
    });

    editor.onDidChangeModelContent((e) => {
      const addedChars = e.changes.reduce((sum, c) => sum + c.text.length, 0);
      if (addedChars > 0) {
        useCodeLabStore.getState().incrementTypedChars(addedChars);
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-[#1e1e1e]">
      {!touchEditor && <MonacoInit />}
      <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800 md:hidden" aria-label="HTML and CSS workspace">
        {(['code', 'preview'] as const).map(view => <button key={view} type="button" aria-pressed={mobileView === view} onClick={() => setMobileView(view)} className={`min-h-12 flex-1 text-sm font-semibold ${mobileView === view ? 'bg-orange-50 text-orange-950 dark:bg-orange-950 dark:text-orange-100' : 'text-slate-600 dark:text-slate-300'}`}>{view === 'code' ? 'Edit code' : 'Live preview'}</button>)}
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* Editor Panel — Left Half */}
      <div className={`min-h-0 flex-1 ${mobileView === 'code' ? 'flex' : 'hidden md:flex'} flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 min-w-0`}>
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-[#161b22] border-b border-slate-200 dark:border-slate-800 flex-none">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {language.toUpperCase()} Source Code
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono font-medium">
            {code.split("\n").length} lines
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {touchEditor ? <textarea ref={touchInput} aria-label={`${language.toUpperCase()} code editor`} value={code}
            autoCapitalize="off" autoCorrect="off" spellCheck={false}
            onChange={event => {
              const value = event.target.value;
              if (value.length > code.length) useCodeLabStore.getState().incrementTypedChars(value.length - code.length);
              handleChange(value);
            }}
            onPaste={event => {
              const store = useCodeLabStore.getState(); store.incrementPasteCount();
              store.addPasteEvent({ timestamp: new Date().toISOString(), charCount: event.clipboardData.getData('text').length, language: store.language });
            }}
            className="block h-full min-h-32 w-full resize-none rounded-none border-0 bg-white p-4 font-mono text-base leading-7 text-slate-900 outline-offset-[-2px] dark:bg-[#1e1e1e] dark:text-slate-100"
          /> : <Editor
            height="100%"
            language={language}
            value={code}
            theme={themeMode === "dark" ? "vs-dark" : "vs"}
            onChange={handleChange}
            onMount={handleEditorMount}
            options={{
              fontSize: 14,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: "on",
              lineNumbers: "on",
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
            }}
          />}
          {touchEditor && <CodeSymbolBar editor={touchInput} value={code} onChange={handleChange} />}
        </div>
      </div>

      {/* Live Preview Panel — Right Half */}
      <div className={`min-h-0 flex-1 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'} flex-col min-w-0 bg-white`}>
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-none">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Live Browser Preview
            </span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            Sandboxed IFrame
          </span>
        </div>

        <iframe
          ref={iframeRef}
          title="HTML/CSS Live Sandbox Preview"
          className="flex-1 w-full h-full border-none bg-white"
          sandbox="allow-scripts"
        />
      </div>
      </div>
    </div>
  );
}
