"use client";

import React, { useState, useEffect, useRef } from "react";
import type { OnMount } from "@monaco-editor/react";
import dynamic from 'next/dynamic';
import { useTheme } from "@/lib/theme-context";
import { useCodeLabStore } from "../stores/codelab-store";
import { Eye, Code2 } from "lucide-react";
import MonacoInit from "@/components/common/MonacoInit";
import { CodeSymbolBar } from './CodeSymbolBar';
import { ResizeDivider } from './ResizeDivider';
import { buildStaticPreviewDocument } from '../utils/html-css-runner';

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
  const workspace = useRef<HTMLDivElement>(null);
  const [sourceShare, setSourceShare] = useState(50);
  const [stacked, setStacked] = useState(false);
  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setStacked(entry.contentRect.width < 520));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
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
        iframeRef.current.srcdoc = buildStaticPreviewDocument(buildSrcDoc(code));
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
    <div ref={workspace} data-codelab-html-workspace className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white dark:bg-[#1e1e1e]">
      {!touchEditor && <MonacoInit />}
      <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800 md:hidden" aria-label="HTML and CSS workspace">
        {(['code', 'preview'] as const).map(view => <button key={view} type="button" aria-pressed={mobileView === view} onClick={() => setMobileView(view)} className={`min-h-12 flex-1 text-sm font-semibold ${mobileView === view ? 'bg-orange-50 text-orange-950 dark:bg-orange-950 dark:text-orange-100' : 'text-slate-600 dark:text-slate-300'}`}>{view === 'code' ? 'Edit code' : 'Live preview'}</button>)}
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:grid"
        style={{ gridTemplateColumns: stacked ? 'minmax(0, 1fr)' : `minmax(0, ${sourceShare}fr) 6px minmax(0, ${100 - sourceShare}fr)`,
          gridTemplateRows: stacked ? `minmax(0, ${sourceShare}fr) 6px minmax(0, ${100 - sourceShare}fr)` : 'minmax(0, 1fr)' }}>
      {/* Editor Panel — Left Half */}
      <div data-codelab-source className={`min-h-0 flex-1 ${mobileView === 'code' ? 'flex' : 'hidden md:flex'} flex-col overflow-hidden min-w-0`}>
        <div className="flex min-h-11 min-w-0 items-center justify-between gap-2 px-3 bg-slate-50 dark:bg-[#181B26] border-b border-slate-200 dark:border-slate-800 flex-none">
          <div className="flex min-w-0 items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-orange-500" />
            <span className="whitespace-nowrap text-xs font-semibold text-slate-700 dark:text-slate-300">
              {language.toUpperCase()} source
            </span>
          </div>
          <div className="shrink-0 whitespace-nowrap text-[11px] text-slate-500 dark:text-slate-400 font-mono font-medium">
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
            className="block h-full min-h-0 w-full resize-none rounded-none border-0 bg-white p-4 font-mono text-base leading-7 text-slate-900 outline-offset-[-2px] dark:bg-[#1e1e1e] dark:text-slate-100"
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

      <ResizeDivider label="Resize source and preview panels" value={sourceShare} onChange={setSourceShare}
        stacked={stacked} minBefore={stacked ? 120 : 200} minAfter={stacked ? 120 : 200} />

      {/* Live Preview Panel — Right Half */}
      <div data-codelab-preview className={`min-h-0 flex-1 ${mobileView === 'preview' ? 'flex' : 'hidden md:flex'} flex-col overflow-hidden min-w-0 bg-white`}>
        <div className="flex min-h-11 items-center gap-2 px-3 bg-slate-50 dark:bg-[#181B26] border-b border-slate-200 dark:border-slate-800 flex-none">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-emerald-500" />
            <span className="whitespace-nowrap text-xs font-semibold text-slate-700 dark:text-slate-300">
              Live preview
            </span>
          </div>

        </div>

        <iframe
          ref={iframeRef}
          title="HTML/CSS Live Sandbox Preview"
          className="min-h-0 min-w-0 flex-1 w-full border-none bg-white"
          sandbox=""
        />
      </div>
      </div>
    </div>
  );
}
