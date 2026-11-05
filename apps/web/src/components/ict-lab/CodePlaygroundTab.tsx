"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  RotateCcw,
  Code2,
  Terminal,
  Eraser,
  Loader2,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";
import type { PlaygroundEditorLanguage } from "./CodeMirrorEditor";
import {
  MAX_PLAYGROUND_BYTES,
  type PlaygroundConsoleEntry,
  buildPlaygroundSrcdoc,
  computeProjectByteSize,
  validatePreviewMessageEvent,
} from "@/lib/ict-lab/rules";
import {
  PLAYGROUND_EXAMPLES,
  DEFAULT_EXAMPLE,
} from "@/lib/ict-lab/examples";

const LazyCodeMirrorEditor = dynamic(() => import("./CodeMirrorEditor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-surface text-xs font-medium text-secondary-theme">
      <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
      Loading CodeMirror 6 editor...
    </div>
  ),
});

const EDITOR_TABS: { id: PlaygroundEditorLanguage; label: string; badge: string; placeholder: string }[] = [
  {
    id: "html",
    label: "HTML",
    badge: "index.html",
    placeholder: "<!-- Write your HTML markup here -->",
  },
  {
    id: "css",
    label: "CSS",
    badge: "styles.css",
    placeholder: "/* Write your CSS rules here */",
  },
  {
    id: "javascript",
    label: "JavaScript",
    badge: "script.js",
    placeholder: "// Write your JavaScript code here (use addEventListener)",
  },
];

export interface CodePlaygroundTabProps {
  nonce?: string;
}

export default function CodePlaygroundTab({ nonce }: CodePlaygroundTabProps = {}) {
  const resolveActiveNonce = useCallback((): string | undefined => {
    if (nonce) return nonce;
    if (typeof document !== "undefined") {
      const el = document.querySelector("script[nonce]") as HTMLScriptElement | null;
      return el?.nonce || el?.getAttribute("nonce") || undefined;
    }
    return undefined;
  }, [nonce]);

  const [selectedExampleId, setSelectedExampleId] = useState<string>(DEFAULT_EXAMPLE.id);
  const [htmlCode, setHtmlCode] = useState<string>(DEFAULT_EXAMPLE.html);
  const [cssCode, setCssCode] = useState<string>(DEFAULT_EXAMPLE.css);
  const [jsCode, setJsCode] = useState<string>(DEFAULT_EXAMPLE.js);

  const [activeEditorTab, setActiveEditorTab] = useState<PlaygroundEditorLanguage>("html");
  const [autoRun, setAutoRun] = useState<boolean>(false);
  const runCounterRef = useRef<number>(0);
  const [srcdoc, setSrcdoc] = useState<string>(() =>
    buildPlaygroundSrcdoc(
      DEFAULT_EXAMPLE.html,
      DEFAULT_EXAMPLE.css,
      DEFAULT_EXAMPLE.js,
      0,
      nonce ||
        (typeof document !== "undefined"
          ? (document.querySelector("script[nonce]") as HTMLScriptElement | null)?.nonce
          : undefined)
    )
  );
  const [consoleEntries, setConsoleEntries] = useState<PlaygroundConsoleEntry[]>([]);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const currentExample = useMemo(
    () => PLAYGROUND_EXAMPLES.find((ex) => ex.id === selectedExampleId) ?? DEFAULT_EXAMPLE,
    [selectedExampleId]
  );

  const isDirty = useMemo(() => {
    return (
      htmlCode !== currentExample.html ||
      cssCode !== currentExample.css ||
      jsCode !== currentExample.js
    );
  }, [htmlCode, cssCode, jsCode, currentExample]);

  const currentByteSize = useMemo(
    () => computeProjectByteSize(htmlCode, cssCode, jsCode),
    [htmlCode, cssCode, jsCode]
  );

  const isOverSizeLimit = currentByteSize > MAX_PLAYGROUND_BYTES;

  // Warn before unloading browser tab when code has unsaved modifications
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Listen for sandboxed iframe console / runtime error messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const entry = validatePreviewMessageEvent(
        event,
        iframeRef.current ? iframeRef.current.contentWindow : null
      );
      if (!entry) return;
      setConsoleEntries((prev) => [...prev.slice(-199), entry]);
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const runPreview = useCallback(
    (nextHtml: string, nextCss: string, nextJs: string) => {
      runCounterRef.current += 1;
      setConsoleEntries([]);
      setSrcdoc(
        buildPlaygroundSrcdoc(
          nextHtml,
          nextCss,
          nextJs,
          runCounterRef.current,
          resolveActiveNonce()
        )
      );
    },
    [resolveActiveNonce]
  );

  // Optional debounced auto-run
  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(() => {
      runPreview(htmlCode, cssCode, jsCode);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [autoRun, htmlCode, cssCode, jsCode, runPreview]);

  const handleSelectExample = (exampleId: string) => {
    if (exampleId === selectedExampleId) return;
    const nextExample = PLAYGROUND_EXAMPLES.find((ex) => ex.id === exampleId);
    if (!nextExample) return;

    if (isDirty) {
      const confirmed = window.confirm(
        "You have modified the current code. Discard your edits and load the selected example?"
      );
      if (!confirmed) return;
    }

    setSelectedExampleId(nextExample.id);
    setHtmlCode(nextExample.html);
    setCssCode(nextExample.css);
    setJsCode(nextExample.js);
    runPreview(nextExample.html, nextExample.css, nextExample.js);
  };

  const handleResetCode = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        `Reset code to the default "${currentExample.title}" snippet? This will discard your current edits.`
      );
      if (!confirmed) return;
    }
    setHtmlCode(currentExample.html);
    setCssCode(currentExample.css);
    setJsCode(currentExample.js);
    runPreview(currentExample.html, currentExample.css, currentExample.js);
  };

  const activeCodeValue =
    activeEditorTab === "html" ? htmlCode : activeEditorTab === "css" ? cssCode : jsCode;

  const handleEditorChange = useCallback(
    (nextVal: string) => {
      if (activeEditorTab === "html") setHtmlCode(nextVal);
      else if (activeEditorTab === "css") setCssCode(nextVal);
      else setJsCode(nextVal);
    },
    [activeEditorTab]
  );

  const activeTabMeta = EDITOR_TABS.find((t) => t.id === activeEditorTab) ?? EDITOR_TABS[0]!;

  return (
    <div className="space-y-4">
      {/* Practice Toolbar: Examples Dropdown + Reset + Auto-run + Run Code */}
      <div className="rounded-xl border border-theme bg-surface p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Examples selector + Size limit indicator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <label htmlFor="ict-example-select" className="text-xs font-semibold text-primary-theme">
                Starter Example:
              </label>
              <select
                id="ict-example-select"
                value={selectedExampleId}
                onChange={(e) => handleSelectExample(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-1.5 text-xs font-medium text-primary-theme [color-scheme:light] dark:[color-scheme:dark] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {PLAYGROUND_EXAMPLES.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-surface text-primary-theme">
                    {ex.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleResetCode}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-1.5 text-xs font-semibold text-primary-theme transition hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Reset code to current example template"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Code
            </button>

            <span className="text-xs font-medium text-secondary-theme">
              Code Size:{" "}
              <span className={isOverSizeLimit ? "font-bold text-red-600 dark:text-red-400" : ""}>
                {(currentByteSize / 1024).toFixed(1)} / {(MAX_PLAYGROUND_BYTES / 1024).toFixed(0)} KB
              </span>
            </span>
          </div>

          {/* Right: Auto-run + Run Code */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1.5 text-xs font-medium text-primary-theme [color-scheme:light] dark:[color-scheme:dark]">
              <input
                type="checkbox"
                checked={autoRun}
                onChange={(e) => setAutoRun(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 dark:border-white/20 accent-blue-600 [color-scheme:light] dark:[color-scheme:dark] focus:ring-blue-500"
              />
              Auto-run
            </label>

            <button
              type="button"
              onClick={() => runPreview(htmlCode, cssCode, jsCode)}
              disabled={isOverSizeLimit}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run Code
            </button>
          </div>
        </div>

        {/* Practice Mode Notice & Script Guideline */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10 px-3 py-2 text-xs text-blue-900 dark:text-blue-200">
          <div className="inline-flex items-center gap-1.5">
            <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>
              <strong>Practice mode:</strong> your code isn&apos;t saved. Refreshing the page resets it.
            </span>
          </div>
          <span className="text-[11px] text-blue-800/80 dark:text-blue-300/80">
            Use <code className="rounded bg-blue-100 dark:bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">addEventListener</code> instead of inline <code className="rounded bg-blue-100 dark:bg-blue-500/20 px-1 py-0.5 font-mono text-[10px]">onclick=&quot;...&quot;</code> (inline handlers are blocked in the sandbox).
          </span>
        </div>
      </div>

      {/* Main Split Workspace: Left Code Editor | Right Preview & Console */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: CodeMirror 6 Editor with HTML/CSS/JavaScript tabs */}
        <div className="flex h-[540px] flex-col overflow-hidden rounded-xl border border-theme bg-surface shadow-sm lg:col-span-6">
          <div
            role="tablist"
            aria-label="Code language tabs"
            className="flex items-center justify-between border-b border-theme bg-elevated px-3 pt-2"
          >
            <div className="flex items-center gap-1">
              {EDITOR_TABS.map((tab) => {
                const isSelected = activeEditorTab === tab.id;
                const charLen =
                  tab.id === "html"
                    ? htmlCode.length
                    : tab.id === "css"
                      ? cssCode.length
                      : jsCode.length;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    onClick={() => setActiveEditorTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-t-lg border-b-2 px-3.5 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isSelected
                        ? "border-blue-600 dark:border-blue-400 bg-surface text-blue-700 dark:text-blue-300"
                        : "border-transparent text-secondary-theme hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-primary-theme"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {charLen > 0 && (
                      <span className="rounded-full bg-slate-200/70 dark:bg-white/10 px-1.5 py-0.2 text-[10px] font-medium text-secondary-theme">
                        {charLen}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <span className="pb-1.5 font-mono text-xs font-medium text-secondary-theme">
              {activeTabMeta.badge}
            </span>
          </div>

          {activeEditorTab === "javascript" && (
            <div className="border-b border-theme bg-elevated/40 px-3 py-1 text-[11px] text-secondary-theme">
              Note: Use <code className="font-mono text-primary-theme">addEventListener</code> instead of <code className="font-mono text-primary-theme">onclick=&quot;...&quot;</code> (inline handlers are blocked in the sandbox).
            </div>
          )}

          <div className="relative flex-1 overflow-hidden bg-surface">
            <LazyCodeMirrorEditor
              language={activeEditorTab}
              value={activeCodeValue}
              onChange={handleEditorChange}
              placeholder={activeTabMeta.placeholder}
              ariaLabel={`${activeTabMeta.label} code editor`}
            />
          </div>
        </div>

        {/* Right Column: Live Sandboxed Preview + Plain-Text Console */}
        <div className="flex h-[540px] flex-col gap-3 lg:col-span-6">
          {/* Sandboxed Preview */}
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-theme bg-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-theme bg-elevated px-3.5 py-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-primary-theme">Live Preview</span>
              </div>
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
                title="Isolated sandbox=allow-scripts with strict Content-Security-Policy (network & parent DOM blocked)"
              >
                <ShieldCheck className="h-3 w-3" />
                Sandboxed (CSP Isolated)
              </span>
            </div>

            <div className="relative flex-1 bg-white">
              <iframe
                ref={iframeRef}
                title="Code Playground Live Preview"
                sandbox="allow-scripts"
                srcDoc={srcdoc}
                className="h-full w-full border-0 bg-white"
              />
            </div>
          </div>

          {/* Console Output Panel */}
          <div className="flex h-44 flex-col overflow-hidden rounded-xl border border-theme bg-surface text-primary-theme shadow-sm">
            <div className="flex items-center justify-between border-b border-theme bg-elevated px-3.5 py-1.5">
              <div className="flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span className="text-xs font-semibold text-primary-theme">
                  Console &amp; Runtime Errors
                </span>
                <span className="rounded-full bg-slate-200/70 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-secondary-theme">
                  {consoleEntries.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConsoleEntries([])}
                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-secondary-theme hover:bg-slate-200/60 dark:hover:bg-white/10 hover:text-primary-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Eraser className="h-3 w-3" />
                Clear
              </button>
            </div>

            <div
              className="flex-1 space-y-1 overflow-y-auto bg-surface p-2.5 font-mono text-xs"
              role="log"
              aria-live="polite"
              aria-label="Playground console output"
            >
              {consoleEntries.length === 0 ? (
                <p className="text-secondary-theme">
                  Console output from console.log(), console.warn(), console.error(), and runtime
                  exceptions will appear here.
                </p>
              ) : (
                consoleEntries.map((entry, idx) => {
                  const badgeStyle =
                    entry.level === "error"
                      ? "border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-500/15 dark:text-red-200"
                      : entry.level === "warn"
                        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200"
                        : "border-theme bg-elevated text-primary-theme";
                  return (
                    <div
                      key={`${entry.timestamp}-${idx}`}
                      className={`flex items-start gap-2 rounded border px-2 py-1 ${badgeStyle}`}
                    >
                      <span className="shrink-0 uppercase text-[10px] font-bold opacity-85">
                        [{entry.level}]
                      </span>
                      <span className="whitespace-pre-wrap break-all">{entry.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
