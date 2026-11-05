"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Play,
  Plus,
  Save,
  Trash2,
  Edit3,
  Terminal,
  Eraser,
  FolderOpen,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { PlaygroundEditorLanguage } from "./CodeMirrorEditor";
import type { IctPlaygroundProjectDTO } from "@/lib/ict-lab/types";
import {
  ICT_PLAYGROUND_STORAGE_UNAVAILABLE_MESSAGE,
  MAX_PLAYGROUND_BYTES,
  MAX_PLAYGROUND_PROJECTS_PER_STUDENT,
  MAX_PROJECT_TITLE_LENGTH,
  type PlaygroundConsoleEntry,
  buildPlaygroundSrcdoc,
  computeProjectByteSize,
  validatePreviewMessageEvent,
} from "@/lib/ict-lab/rules";

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
    placeholder: "// Write your JavaScript code here",
  },
];

export default function CodePlaygroundTab() {
  const [projects, setProjects] = useState<IctPlaygroundProjectDTO[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [title, setTitle] = useState<string>("Untitled Project");
  const [htmlCode, setHtmlCode] = useState<string>("");
  const [cssCode, setCssCode] = useState<string>("");
  const [jsCode, setJsCode] = useState<string>("");

  const [savedSnapshot, setSavedSnapshot] = useState({
    title: "Untitled Project",
    html: "",
    css: "",
    js: "",
  });

  const [activeEditorTab, setActiveEditorTab] = useState<PlaygroundEditorLanguage>("html");
  const [autoRun, setAutoRun] = useState<boolean>(false);
  const runCounterRef = useRef<number>(0);
  const [srcdoc, setSrcdoc] = useState<string>(() => buildPlaygroundSrcdoc("", "", "", 0));
  const [consoleEntries, setConsoleEntries] = useState<PlaygroundConsoleEntry[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [statusBanner, setStatusBanner] = useState<{
    kind: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const isDirty = useMemo(() => {
    return (
      title !== savedSnapshot.title ||
      htmlCode !== savedSnapshot.html ||
      cssCode !== savedSnapshot.css ||
      jsCode !== savedSnapshot.js
    );
  }, [title, htmlCode, cssCode, jsCode, savedSnapshot]);

  const currentByteSize = useMemo(
    () => computeProjectByteSize(htmlCode, cssCode, jsCode),
    [htmlCode, cssCode, jsCode]
  );

  const isOverSizeLimit = currentByteSize > MAX_PLAYGROUND_BYTES;

  // Warn before unloading browser tab when dirty
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

  // Load caller's projects on mount
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const res = await fetch("/api/ite/ict-lab/projects", {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as {
          message?: string;
          storageUnavailable?: boolean;
        };
        setProjects([]);
        setStatusBanner({
          kind: res.status === 503 || errData.storageUnavailable ? "warning" : "error",
          text:
            errData.message ||
            (res.status === 503
              ? ICT_PLAYGROUND_STORAGE_UNAVAILABLE_MESSAGE
              : "Failed to load saved projects."),
        });
        return;
      }
      const data = (await res.json()) as { projects?: IctPlaygroundProjectDTO[] };
      setProjects(Array.isArray(data.projects) ? data.projects : []);
    } catch (err) {
      setStatusBanner({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not load projects.",
      });
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const runPreview = useCallback(
    (nextHtml: string, nextCss: string, nextJs: string) => {
      runCounterRef.current += 1;
      setConsoleEntries([]);
      setSrcdoc(buildPlaygroundSrcdoc(nextHtml, nextCss, nextJs, runCounterRef.current));
    },
    []
  );

  // Optional debounced auto-run
  useEffect(() => {
    if (!autoRun) return;
    const timer = window.setTimeout(() => {
      runPreview(htmlCode, cssCode, jsCode);
    }, 550);
    return () => window.clearTimeout(timer);
  }, [autoRun, htmlCode, cssCode, jsCode, runPreview]);

  const confirmDiscardIfDirty = useCallback((): boolean => {
    if (!isDirty) return true;
    return window.confirm(
      "You have unsaved changes in your current project. Discard unsaved changes and continue?"
    );
  }, [isDirty]);

  // "New project" starts completely empty (html: "", css: "", js: "") with no starter templates
  const handleNewProject = () => {
    if (!confirmDiscardIfDirty()) return;
    setActiveProjectId(null);
    setTitle("Untitled Project");
    setHtmlCode("");
    setCssCode("");
    setJsCode("");
    setSavedSnapshot({
      title: "Untitled Project",
      html: "",
      css: "",
      js: "",
    });
    setShowDeleteConfirm(false);
    setStatusBanner((prev) => (prev?.kind === "warning" ? prev : null));
    runPreview("", "", "");
  };

  const handleSelectProject = async (projectId: string) => {
    if (!projectId) {
      handleNewProject();
      return;
    }
    if (projectId === activeProjectId) return;
    if (!confirmDiscardIfDirty()) return;

    setStatusBanner(null);
    try {
      const res = await fetch(`/api/ite/ict-lab/projects/${encodeURIComponent(projectId)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      const payload = (await res.json().catch(() => ({}))) as {
        project?: IctPlaygroundProjectDTO;
        message?: string;
        storageUnavailable?: boolean;
      };
      if (!res.ok || !payload.project) {
        setStatusBanner({
          kind: res.status === 503 || payload.storageUnavailable ? "warning" : "error",
          text: payload.message || "Unable to load project.",
        });
        return;
      }
      const proj = payload.project;
      setActiveProjectId(proj.id);
      setTitle(proj.title);
      setHtmlCode(proj.html);
      setCssCode(proj.css);
      setJsCode(proj.js);
      setSavedSnapshot({
        title: proj.title,
        html: proj.html,
        css: proj.css,
        js: proj.js,
      });
      setShowDeleteConfirm(false);
      runPreview(proj.html, proj.css, proj.js);
    } catch (err) {
      setStatusBanner({
        kind: "error",
        text: err instanceof Error ? err.message : "Failed to load project.",
      });
    }
  };

  const handleSaveProject = async (overrideTitle?: string) => {
    const cleanTitle = (overrideTitle ?? title).trim();
    if (!cleanTitle || cleanTitle.length > MAX_PROJECT_TITLE_LENGTH) {
      setStatusBanner({
        kind: "error",
        text: `Project title must be between 1 and ${MAX_PROJECT_TITLE_LENGTH} characters.`,
      });
      return;
    }
    if (isOverSizeLimit) {
      setStatusBanner({
        kind: "error",
        text: `Combined HTML + CSS + JS exceeds the 100 KB limit (${(
          currentByteSize / 1024
        ).toFixed(1)} KB).`,
      });
      return;
    }

    setIsSaving(true);
    setStatusBanner(null);
    try {
      const isUpdating = Boolean(activeProjectId);
      const endpoint = isUpdating
        ? `/api/ite/ict-lab/projects/${encodeURIComponent(activeProjectId!)}`
        : "/api/ite/ict-lab/projects";
      const method = isUpdating ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          title: cleanTitle,
          html: htmlCode,
          css: cssCode,
          js: jsCode,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        project?: IctPlaygroundProjectDTO;
        message?: string;
        storageUnavailable?: boolean;
      };
      if (!res.ok || !data.project) {
        setStatusBanner({
          kind: res.status === 503 || data.storageUnavailable ? "warning" : "error",
          text:
            data.message ||
            (res.status === 503
              ? ICT_PLAYGROUND_STORAGE_UNAVAILABLE_MESSAGE
              : "Failed to save project."),
        });
        return;
      }

      const saved = data.project;
      setActiveProjectId(saved.id);
      setTitle(saved.title);
      setSavedSnapshot({
        title: saved.title,
        html: saved.html,
        css: saved.css,
        js: saved.js,
      });
      setProjects((prev) => {
        const filtered = prev.filter((p) => p.id !== saved.id);
        return [saved, ...filtered];
      });
      setStatusBanner({
        kind: "success",
        text: isUpdating ? `Saved "${saved.title}".` : `Created project "${saved.title}".`,
      });
    } catch (err) {
      setStatusBanner({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not save project.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenRename = () => {
    setRenameDraft(title);
    setShowRenameModal(true);
  };

  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameDraft.trim();
    if (!trimmed || trimmed.length > MAX_PROJECT_TITLE_LENGTH) {
      setStatusBanner({
        kind: "error",
        text: `Title must be between 1 and ${MAX_PROJECT_TITLE_LENGTH} characters.`,
      });
      return;
    }
    setTitle(trimmed);
    setShowRenameModal(false);
    if (activeProjectId) {
      await handleSaveProject(trimmed);
    }
  };

  const handleDeleteProject = async () => {
    if (!activeProjectId) return;
    setIsDeleting(true);
    setStatusBanner(null);
    try {
      const res = await fetch(`/api/ite/ict-lab/projects/${encodeURIComponent(activeProjectId)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        storageUnavailable?: boolean;
      };
      if (!res.ok) {
        setStatusBanner({
          kind: res.status === 503 || data.storageUnavailable ? "warning" : "error",
          text: data.message || "Failed to delete project.",
        });
        return;
      }
      const deletedTitle = title;
      setProjects((prev) => prev.filter((p) => p.id !== activeProjectId));
      setActiveProjectId(null);
      setTitle("Untitled Project");
      setHtmlCode("");
      setCssCode("");
      setJsCode("");
      setSavedSnapshot({
        title: "Untitled Project",
        html: "",
        css: "",
        js: "",
      });
      setShowDeleteConfirm(false);
      runPreview("", "", "");
      setStatusBanner({
        kind: "success",
        text: `Deleted project "${deletedTitle}".`,
      });
    } catch (err) {
      setStatusBanner({
        kind: "error",
        text: err instanceof Error ? err.message : "Could not delete project.",
      });
    } finally {
      setIsDeleting(false);
    }
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
      {/* Top Toolbar: Project Selector + Actions + Run */}
      <div className="rounded-xl border border-theme bg-surface p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Project Selector & Title */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <label htmlFor="ict-project-select" className="sr-only">
                Saved Projects
              </label>
              <select
                id="ict-project-select"
                value={activeProjectId ?? ""}
                onChange={(e) => void handleSelectProject(e.target.value)}
                disabled={isLoadingProjects}
                className="rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-1.5 text-xs font-medium text-primary-theme [color-scheme:light] dark:[color-scheme:dark] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="" className="bg-surface text-primary-theme">
                  {activeProjectId ? "— Switch to Blank Unsaved —" : "Unsaved Workspace"}
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-primary-theme">
                    {p.title} ({(p.byteSize / 1024).toFixed(1)} KB)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1">
              <span className="text-xs font-semibold text-primary-theme">{title}</span>
              {isDirty && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200"
                  title="You have unsaved changes"
                >
                  ● Unsaved
                </span>
              )}
              <button
                type="button"
                onClick={handleOpenRename}
                className="ml-1 rounded p-1 text-secondary-theme hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-primary-theme focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Rename project"
                aria-label="Rename project"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>

            <span className="text-xs font-medium text-secondary-theme">
              {projects.length}/{MAX_PLAYGROUND_PROJECTS_PER_STUDENT} saved •{" "}
              <span className={isOverSizeLimit ? "font-bold text-red-600 dark:text-red-400" : ""}>
                {(currentByteSize / 1024).toFixed(1)} / {(MAX_PLAYGROUND_BYTES / 1024).toFixed(0)} KB
              </span>
            </span>
          </div>

          {/* Right: New, Save, Delete, Auto-run, Run */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleNewProject}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-elevated px-3 py-1.5 text-xs font-semibold text-primary-theme transition hover:bg-slate-100 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </button>

            <button
              type="button"
              onClick={() => void handleSaveProject()}
              disabled={isSaving || isOverSizeLimit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 transition hover:bg-blue-100 dark:hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>

            {activeProjectId && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:bg-red-100 dark:hover:bg-red-500/25 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}

            <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme bg-elevated px-2.5 py-1.5 text-xs font-medium text-primary-theme [color-scheme:light] dark:[color-scheme:dark]">
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run Code
            </button>
          </div>
        </div>

        {/* Rename Modal inline */}
        {showRenameModal && (
          <form
            onSubmit={(e) => void handleConfirmRename(e)}
            className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-2.5"
          >
            <label htmlFor="rename-project-input" className="text-xs font-semibold text-primary-theme">
              Project Title (1–80 chars):
            </label>
            <input
              id="rename-project-input"
              type="text"
              maxLength={MAX_PROJECT_TITLE_LENGTH}
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              className="min-w-[220px] flex-1 rounded-md border border-slate-300 dark:border-white/15 bg-surface px-2.5 py-1 text-xs text-primary-theme [color-scheme:light] dark:[color-scheme:dark] focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => setShowRenameModal(false)}
              className="rounded-md border border-slate-300 dark:border-white/15 bg-elevated px-2.5 py-1 text-xs font-medium text-secondary-theme hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Delete Confirmation inline */}
        {showDeleteConfirm && activeProjectId && (
          <div
            role="alertdialog"
            aria-label="Confirm project deletion"
            className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-2.5"
          >
            <span className="text-xs font-medium text-red-800 dark:text-red-200">
              Delete saved project <strong>&ldquo;{title}&rdquo;</strong> permanently? This cannot be
              undone.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDeleteProject()}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-md border border-slate-300 dark:border-white/15 bg-elevated px-2.5 py-1 text-xs font-medium text-primary-theme hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Status feedback banner */}
        {statusBanner && (
          <div
            role="status"
            className={`mt-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${
              statusBanner.kind === "success"
                ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                : statusBanner.kind === "warning"
                  ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/15 text-amber-900 dark:text-amber-200"
                  : "border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/15 text-red-800 dark:text-red-200"
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              {statusBanner.kind === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : statusBanner.kind === "warning" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
              )}
              {statusBanner.text}
            </span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-xs underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}
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

            {/* The preview content area inside the iframe intentionally stays white so student web pages render against a standard browser default canvas. */}
            <div className="relative flex-1 bg-white">
              {/* Strictly sandbox="allow-scripts" ONLY — never allow-same-origin, allow-forms, allow-popups, or allow-top-navigation */}
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
                      {/* Rendered strictly as plain text node (never dangerouslySetInnerHTML) */}
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
