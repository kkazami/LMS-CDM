"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Code2,
  Highlighter,
  Italic,
  LayoutGrid,
  ListTodo,
  Palette,
  Pin,
  Trash2,
  Strikethrough,
  Underline,
  X,
  Bold,
} from "lucide-react";
import type { CalendarEvent, Note, Task } from "@/lib/lms-types";
import { buildMonthMatrix, formatDateKey } from "@/lib/calendar";
import { serializeNote, serializeTask } from "@/lib/workspace";

type ViewMode = "grid" | "list";
type ModuleTab = "notes" | "tasks" | "calendar";

type WorkspaceDashboardProps = {
  instituteCode: string;
  notes: Note[];
  tasks: Task[];
  events: CalendarEvent[];
  courseOptions: Array<{ id: string; title: string; code: string }>;
};

type NoteDraft = {
  title: string;
  content: string;
  category: string;
  color: string;
};

type TaskDraft = {
  title: string;
  description: string;
  priority: Task["priority"];
  dueDate: string;
  courseId: string;
};

const NOTE_COLORS = ["#ffffff", "#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#ede9fe", "#ffe4e6", "#f5e7ff", "#e0f2fe", "#fefce8", "#f0fdf4", "#fdf2f8"];
const NOTE_COVER_OPTIONS = [
  {
    id: "sunset",
    label: "Sunset",
    image: "linear-gradient(135deg, #fbbf24 0%, #f97316 45%, #7c2d12 100%)",
    color: "#fef3c7",
    accent: "#fb923c",
  },
  {
    id: "sea",
    label: "Sea",
    image: "radial-gradient(circle at top left, #bae6fd 0%, #38bdf8 30%, #0f172a 100%)",
    color: "#dbeafe",
    accent: "#38bdf8",
  },
  {
    id: "garden",
    label: "Garden",
    image: "linear-gradient(135deg, #86efac 0%, #16a34a 40%, #14532d 100%)",
    color: "#dcfce7",
    accent: "#4ade80",
  },
  {
    id: "rose",
    label: "Rose",
    image: "linear-gradient(135deg, #fbcfe8 0%, #f472b6 45%, #9d174d 100%)",
    color: "#fce7f3",
    accent: "#f472b6",
  },
  {
    id: "lavender",
    label: "Lavender",
    image: "linear-gradient(135deg, #ddd6fe 0%, #a78bfa 45%, #5b21b6 100%)",
    color: "#ede9fe",
    accent: "#a78bfa",
  },
  {
    id: "peach",
    label: "Peach",
    image: "linear-gradient(135deg, #fecaca 0%, #fb923c 45%, #9a2c00 100%)",
    color: "#ffe4e6",
    accent: "#fb923c",
  },
];
const NOTE_CATEGORIES = ["Class Notes", "Homework", "Reading", "Exam Prep", "Ideas", "Other"];
const CALENDAR_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, "").trim();
}

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

async function apiRequest(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const rawBody = await response.text().catch(() => "");
    let message = rawBody || "Request failed.";

    if (rawBody) {
      try {
        const payload = JSON.parse(rawBody) as { message?: string };
        message = payload.message ?? rawBody;
      } catch {
        message = rawBody;
      }
    }

    throw new Error(message);
  }

  return response.json();
}

function toolbarButtonClass(active = false) {
  return [
    "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400/60",
    active
      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
  ].join(" ");
}

function formatRelativeDueDate(dueDate: string | null) {
  if (!dueDate) return "No due date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(dueDate));
}

function toIsoDateTime(dateValue: string) {
  return new Date(`${dateValue}T00:00:00.000Z`).toISOString();
}

export default function WorkspaceDashboard({ instituteCode, notes: initialNotes, tasks: initialTasks, events: initialEvents, courseOptions }: WorkspaceDashboardProps) {
  const [moduleTab, setModuleTab] = useState<ModuleTab>("notes");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [events, setEvents] = useState(initialEvents);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [noteDraft, setNoteDraft] = useState<NoteDraft>({ title: "", content: "", category: "General", color: "#ffffff" });
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({ title: "", description: "", priority: "medium", dueDate: "", courseId: "" });
  const [expandedNoteTitle, setExpandedNoteTitle] = useState("");
  const [expandedNoteContent, setExpandedNoteContent] = useState("");
  const [editorFormatState, setEditorFormatState] = useState({ bold: false, italic: false, underline: false, strikeThrough: false, unorderedList: false });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showExpandedColorPicker, setShowExpandedColorPicker] = useState(false);
  const [customCategoryDraft, setCustomCategoryDraft] = useState("");
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(() => formatDateKey(new Date()));
  const [calendarDayNotes, setCalendarDayNotes] = useState<Record<string, string>>({});
  const [isSaving, startTransition] = useTransition();
  const noteDraftEditorRef = useRef<HTMLDivElement>(null);
  const expandedNoteEditorRef = useRef<HTMLDivElement>(null);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const calendarNotePanelRef = useRef<HTMLDivElement>(null);

  const activeNote = useMemo(() => notes.find((note) => note.id === activeNoteId) ?? null, [activeNoteId, notes]);
  const activeEvent = useMemo(() => events.find((event) => event.id === activeEventId) ?? null, [activeEventId, events]);

  const monthMatrix = useMemo(() => buildMonthMatrix(calendarMonth), [calendarMonth]);
  const calendarMonthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(calendarMonth);
  const currentWeekKeys = useMemo(() => {
    const start = new Date();
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);

    const keys = new Set<string>();
    for (let index = 0; index < 7; index += 1) {
      const cursor = new Date(start);
      cursor.setDate(start.getDate() + index);
      keys.add(formatDateKey(cursor));
    }

    return keys;
  }, []);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => currentYear - 5 + index);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const key = formatDateKey(new Date(event.eventDate));
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    }

    return map;
  }, [events]);

  useEffect(() => {
    if (activeNote) {
      const nextContent = activeNote.content ?? "";
      setExpandedNoteTitle(activeNote.title || "Untitled note");
      setExpandedNoteContent(nextContent);

      if (expandedNoteEditorRef.current && expandedNoteEditorRef.current.innerHTML !== nextContent) {
        expandedNoteEditorRef.current.innerHTML = nextContent;
      }
    }
  }, [activeNote?.id]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("workspace-calendar-day-notes");
      if (stored) {
        setCalendarDayNotes(JSON.parse(stored) as Record<string, string>);
      }
    } catch {
      // fail silently and keep the in-memory draft state
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("workspace-calendar-day-notes", JSON.stringify(calendarDayNotes));
  }, [calendarDayNotes]);

  function readNoteEditorContent() {
    return noteDraftEditorRef.current?.innerHTML ?? "";
  }

  function updateEditorFormatState() {
    if (typeof document === "undefined") return;

    setEditorFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
    });
  }

  function handleCalendarDaySelect(day: { isoDate: string; date: Date }) {
    setSelectedCalendarDate(day.isoDate);
    setActiveEventId(null);
    requestAnimationFrame(() => {
      calendarNotePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setCalendarMonth(day.date);
  }

  function updateLocalNote(nextNote: Note) {
    setNotes((current) => current.map((note) => (note.id === nextNote.id ? nextNote : note)));
  }

  function updateLocalTask(nextTask: Task) {
    setTasks((current) => current.map((task) => (task.id === nextTask.id ? nextTask : task)));
  }

  function upsertLocalNote(nextNote: Note) {
    setNotes((current) => {
      const existing = current.some((note) => note.id === nextNote.id);
      return existing ? current.map((note) => (note.id === nextNote.id ? nextNote : note)) : [nextNote, ...current];
    });
  }

  function upsertLocalTask(nextTask: Task) {
    setTasks((current) => {
      const existing = current.some((task) => task.id === nextTask.id);
      return existing ? current.map((task) => (task.id === nextTask.id ? nextTask : task)) : [nextTask, ...current];
    });
  }

  function deleteLocalNote(id: string) {
    setNotes((current) => current.filter((note) => note.id !== id));
  }

  function deleteLocalTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function resetNoteComposer() {
    setNoteDraft({ title: "", content: "", category: "General", color: "#ffffff" });
    setCustomCategoryDraft("");
    setEditorFormatState({ bold: false, italic: false, underline: false, strikeThrough: false, unorderedList: false });

    if (noteDraftEditorRef.current) {
      noteDraftEditorRef.current.innerHTML = "";
    }
  }

  function handleRichFormat(action: "bold" | "italic" | "underline" | "strikeThrough" | "code", targetRef: React.RefObject<HTMLDivElement>) {
    if (action === "code") {
      document.execCommand("insertHTML", false, "<code class='rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-white'>code</code>");
      targetRef.current?.focus();
      updateEditorFormatState();
      return;
    }

    document.execCommand(action, false);
    targetRef.current?.focus();
    updateEditorFormatState();
  }

  function handleListFormat(type: "insertUnorderedList" | "insertOrderedList", targetRef: React.RefObject<HTMLDivElement>) {
    document.execCommand(type, false);
    targetRef.current?.focus();
    updateEditorFormatState();
  }

  function handleChecklist(targetRef: React.RefObject<HTMLDivElement>) {
    document.execCommand("insertUnorderedList", false);
    targetRef.current?.focus();
    updateEditorFormatState();
  }

  async function saveNote(note: Partial<Note> & { id: string }) {
    const payload = {
      id: note.id,
      title: note.title ?? "",
      content: note.content ?? "",
      category: note.category ?? "General",
      color: note.color ?? "#ffffff",
      pinned: note.pinned ?? false,
      archived: note.archived ?? false,
      orderIndex: note.orderIndex ?? 0,
    };

    const saved = await apiRequest("/api/workspace/notes", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    updateLocalNote(serializeNote(saved));
  }

  async function saveTask(task: Partial<Task> & { id: string }) {
    const payload = {
      id: task.id,
      title: task.title ?? "",
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      dueDate: task.dueDate ?? null,
      courseId: task.courseId ?? null,
      completed: task.completed ?? false,
      archived: task.archived ?? false,
      orderIndex: task.orderIndex ?? 0,
    };

    const saved = await apiRequest("/api/workspace/tasks", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    updateLocalTask(serializeTask(saved));
  }

  async function createNote() {
    const title = stripHtml(noteDraft.title).slice(0, 80) || "Untitled note";
    const content = noteDraft.content.trim();

    const optimistic: Note = {
      id: createId("note"),
      title,
      content,
      category: noteDraft.category,
      color: noteDraft.color,
      pinned: false,
      archived: false,
      orderIndex: 0,
      creatorId: "local",
      instituteId: instituteCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertLocalNote(optimistic);
    resetNoteComposer();

    try {
      const saved = await apiRequest("/api/workspace/notes", {
        method: "POST",
        body: JSON.stringify({
          title: optimistic.title,
          content: optimistic.content,
          category: optimistic.category,
          color: optimistic.color,
          pinned: false,
          archived: false,
          orderIndex: 0,
        }),
      });

      deleteLocalNote(optimistic.id);
      upsertLocalNote(serializeNote(saved));
    } catch (error) {
      deleteLocalNote(optimistic.id);
      throw error;
    }
  }

  async function createTask() {
    if (!taskDraft.title.trim()) return;

    const dueDate = taskDraft.dueDate ? toIsoDateTime(taskDraft.dueDate) : null;

    const optimistic: Task = {
      id: createId("task"),
      title: taskDraft.title.trim(),
      description: taskDraft.description,
      priority: taskDraft.priority,
      dueDate,
      courseId: taskDraft.courseId || null,
      courseTitle: courseOptions.find((course) => course.id === taskDraft.courseId)?.title ?? null,
      completed: false,
      archived: false,
      orderIndex: 0,
      creatorId: "local",
      instituteId: instituteCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertLocalTask(optimistic);
    setTaskDraft({ title: "", description: "", priority: "medium", dueDate: "", courseId: "" });
    taskInputRef.current?.focus();

    try {
      const saved = await apiRequest("/api/workspace/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: optimistic.title,
          description: optimistic.description,
          priority: optimistic.priority,
          dueDate,
          courseId: optimistic.courseId,
          completed: false,
          archived: false,
          orderIndex: 0,
        }),
      });

      deleteLocalTask(optimistic.id);
      upsertLocalTask(serializeTask(saved));
    } catch (error) {
      deleteLocalTask(optimistic.id);
      throw error;
    }
  }

  async function toggleTaskCompletion(task: Task) {
    const nextTask = { ...task, completed: !task.completed };
    updateLocalTask(nextTask);

    if (!nextTask.completed) {
      // no-op for line-through removal; UI stays instant
    }

    try {
      await saveTask(nextTask);
    } catch {
      updateLocalTask(task);
    }
  }

  async function toggleNotePin(note: Note) {
    const nextNote = { ...note, pinned: !note.pinned };
    updateLocalNote(nextNote);

    try {
      await saveNote(nextNote);
    } catch {
      updateLocalNote(note);
    }
  }

  async function archiveNote(note: Note) {
    const nextNote = { ...note, archived: true };
    updateLocalNote(nextNote);

    try {
      await saveNote(nextNote);
    } catch {
      updateLocalNote(note);
    }
  }

  async function restoreNote(note: Note) {
    const nextNote = { ...note, archived: false };
    updateLocalNote(nextNote);

    try {
      await saveNote(nextNote);
    } catch {
      updateLocalNote(note);
    }
  }

  async function deleteNote(note: Note) {
    deleteLocalNote(note.id);

    try {
      await apiRequest(`/api/workspace/notes?id=${note.id}`, { method: "DELETE" });
    } catch {
      upsertLocalNote(note);
    }
  }

  async function deleteTask(task: Task) {
    deleteLocalTask(task.id);

    try {
      await apiRequest(`/api/workspace/tasks?id=${task.id}`, { method: "DELETE" });
    } catch {
      upsertLocalTask(task);
    }
  }

  async function toggleTaskArchive(task: Task) {
    const nextTask = { ...task, archived: !task.archived };
    updateLocalTask(nextTask);

    try {
      await saveTask(nextTask);
    } catch {
      updateLocalTask(task);
    }
  }

  const pendingTasks = tasks.filter((task) => !task.completed && !task.archived);
  const completedTasks = tasks.filter((task) => task.completed && !task.archived);
  const visibleNotes = notes.filter((note) => !note.archived);
  const archivedNotes = notes.filter((note) => note.archived);

  const notesGrid = visibleNotes.filter((note) => note.pinned).concat(visibleNotes.filter((note) => !note.pinned));

  function moveTask(task: Task, direction: -1 | 1) {
    const collection = pendingTasks.filter((item) => item.id !== task.id);
    const currentIndex = collection.findIndex((item) => item.id === task.id);
    const nextIndex = Math.max(0, Math.min(collection.length - 1, currentIndex + direction));
    const reordered = [...collection];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(nextIndex, 0, moved);

    reordered.forEach((item, index) => {
      const nextTask = { ...item, orderIndex: index };
      updateLocalTask(nextTask);
      startTransition(() => {
        void saveTask(nextTask);
      });
    });
  }

  return (
    <div className="space-y-8 pb-12 text-slate-900">
      <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Student Workspace</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">Notes, tasks, and deadlines in one quiet surface.</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Designed for fast capture, calm scanning, and instant edits without losing your place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            {[
              { id: "notes", label: "Notes", icon: Highlighter },
              { id: "tasks", label: "To-Do List", icon: ListTodo },
              { id: "calendar", label: "Calendar", icon: CalendarDays },
            ].map((item) => {
              const Icon = item.icon;
              const active = moduleTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setModuleTab(item.id as ModuleTab)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/60",
                    active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {moduleTab === "notes" ? (
        <section className="space-y-5">
          <div className="sticky top-4 z-10 rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur transition-transform focus-within:-translate-y-0.5 focus-within:shadow-md">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="flex min-h-16 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left text-slate-500 transition-all">
                Take Note...
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowArchivedNotes((current) => !current)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                >
                  {showArchivedNotes ? "Hide archived" : "Archived"}
                </button>
                <button
                  onClick={() => {
                    if (!noteDraft.content.trim()) return;
                    void createNote();
                  }}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/60 disabled:opacity-50"
                  disabled={isSaving}
                >
                  Save note
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div
                ref={noteDraftEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  setNoteDraft((current) => ({ ...current, content: readNoteEditorContent() }));
                  updateEditorFormatState();
                }}
                onMouseUp={() => updateEditorFormatState()}
                onKeyUp={() => updateEditorFormatState()}
                onClick={() => updateEditorFormatState()}
                onBlur={() => {
                  setNoteDraft((current) => ({ ...current, content: readNoteEditorContent() }));
                  updateEditorFormatState();
                }}
                className="min-h-44 max-h-80 overflow-y-auto overflow-x-hidden wrap-break-word whitespace-pre-wrap rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-slate-400"
                style={{ backgroundColor: noteDraft.color, scrollbarGutter: "stable" }}
                data-placeholder="Write something useful"
              />

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  <button className={toolbarButtonClass(editorFormatState.bold)} onClick={() => handleRichFormat("bold", noteDraftEditorRef)} aria-label="Bold"><Bold className="h-4 w-4" /></button>
                  <button className={toolbarButtonClass(editorFormatState.italic)} onClick={() => handleRichFormat("italic", noteDraftEditorRef)} aria-label="Italic"><Italic className="h-4 w-4" /></button>
                  <button className={toolbarButtonClass(editorFormatState.underline)} onClick={() => handleRichFormat("underline", noteDraftEditorRef)} aria-label="Underline"><Underline className="h-4 w-4" /></button>
                  <button className={toolbarButtonClass(editorFormatState.strikeThrough)} onClick={() => handleRichFormat("strikeThrough", noteDraftEditorRef)} aria-label="Strikethrough"><Strikethrough className="h-4 w-4" /></button>
                  <button className={toolbarButtonClass(false)} onClick={() => handleRichFormat("code", noteDraftEditorRef)} aria-label="Code"><Code2 className="h-4 w-4" /></button>
                  <button className={toolbarButtonClass(editorFormatState.unorderedList)} onClick={() => handleListFormat("insertUnorderedList", noteDraftEditorRef)} aria-label="Bulleted list"><ListTodo className="h-4 w-4" /></button>
                  <button className={toolbarButtonClass(editorFormatState.unorderedList)} onClick={() => handleChecklist(noteDraftEditorRef)} aria-label="Checklist"><CheckCheck className="h-4 w-4" /></button>
                </div>

                <input
                  value={noteDraft.title}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Title"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/40"
                />

                <div className="flex flex-wrap gap-2">
                  {NOTE_CATEGORIES.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        const nextCategory = category === "Other" ? customCategoryDraft.trim() || "Other" : category;
                        setNoteDraft((current) => ({ ...current, category: nextCategory }));
                      }}
                      className={[
                        "rounded-full px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400/60",
                        noteDraft.category === category ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <input
                  value={customCategoryDraft}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setCustomCategoryDraft(nextValue);
                    if (nextValue.trim()) {
                      setNoteDraft((current) => ({ ...current, category: nextValue.trim() }));
                    } else {
                      setNoteDraft((current) => ({ ...current, category: current.category === "Other" ? "General" : current.category }));
                    }
                  }}
                  placeholder="Custom category"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/60"
                />

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowColorPicker((current) => !current)}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                    >
                      <Palette className="h-4 w-4" />
                      <span className="h-4 w-4 rounded-full border border-slate-300" style={{ backgroundColor: noteDraft.color }} />
                    </button>

                    {showColorPicker ? (
                      <div className="absolute left-0 top-12 z-20 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                        <div className="grid grid-cols-2 gap-2">
                          {NOTE_COVER_OPTIONS.map((cover) => (
                            <button
                              key={cover.id}
                              onClick={() => {
                                setNoteDraft((current) => ({ ...current, color: cover.color }));
                                setShowColorPicker(false);
                              }}
                              className="rounded-2xl border border-slate-200 p-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <div className="relative h-16 overflow-hidden rounded-xl border border-slate-100" style={{ background: cover.image }}>
                                <div className="absolute inset-0 bg-white/10" />
                                <div className="absolute inset-x-0 bottom-0 h-8 bg-white/20 backdrop-blur-[1px]" />
                              </div>
                              <p className="mt-2 text-[11px] font-semibold text-slate-700">{cover.label}</p>
                            </button>
                          ))}
                        </div>
                        <div className="mt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-400">Solid colors</p>
                          <div className="grid grid-cols-6 gap-2">
                            {NOTE_COLORS.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  setNoteDraft((current) => ({ ...current, color }));
                                  setShowColorPicker(false);
                                }}
                                className="h-8 w-8 rounded-full border border-slate-200 transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                                style={{ backgroundColor: color }}
                                aria-label={`Select note color ${color}`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {notesGrid.map((note) => (
              <article
                key={note.id}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-200 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                style={{ backgroundColor: note.color }}
                onClick={() => setActiveNoteId(note.id)}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">{note.category}</span>
                  <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                    <button onClick={(event) => { event.stopPropagation(); void toggleNotePin(note); }} className="rounded-full bg-white/80 p-2 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Pin note">
                      <Pin className={[
                        "h-4 w-4",
                        note.pinned ? "fill-current" : "",
                      ].join(" ")} />
                    </button>
                    <button onClick={(event) => { event.stopPropagation(); void archiveNote(note); }} className="rounded-full bg-white/80 p-2 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Archive note">
                      <Archive className="h-4 w-4" />
                    </button>
                    <button onClick={(event) => { event.stopPropagation(); void deleteNote(note); }} className="rounded-full bg-white/80 p-2 text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Delete note">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-base font-semibold tracking-tight text-slate-900">{note.title || "Untitled note"}</h3>
                <div className="mt-3 line-clamp-6 text-sm leading-6 text-slate-700" dangerouslySetInnerHTML={{ __html: note.content || "<p class='text-slate-400'>No content</p>" }} />
              </article>
            ))}
          </div>

          {showArchivedNotes && archivedNotes.length ? (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Archived Notes</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">{archivedNotes.length}</span>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {archivedNotes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm"
                    style={{ backgroundColor: note.color }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">{note.category}</span>
                      <button onClick={() => void restoreNote(note)} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/60">
                        Restore
                      </button>
                    </div>
                    <h4 className="mt-3 text-base font-semibold tracking-tight text-slate-900">{note.title || "Untitled note"}</h4>
                    <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-700">{stripHtml(note.content || "No content")}</p>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {moduleTab === "tasks" ? (
        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">To-Do List</h3>
                <p className="mt-1 text-sm text-slate-600">Capture fast, then move into priority without friction.</p>
              </div>

              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                <button onClick={() => setViewMode("grid")} className={[
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400/60",
                  viewMode === "grid" ? "bg-white shadow-sm" : "text-slate-500",
                ].join(" ")}>
                  <LayoutGrid className="h-4 w-4" /> Grid
                </button>
                <button onClick={() => setViewMode("list")} className={[
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400/60",
                  viewMode === "list" ? "bg-white shadow-sm" : "text-slate-500",
                ].join(" ")}>
                  <ListTodo className="h-4 w-4" /> List
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_180px_220px_auto]">
              <input
                ref={taskInputRef}
                value={taskDraft.title}
                onChange={(event) => setTaskDraft((current) => ({ ...current, title: event.target.value }))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void createTask();
                  }
                }}
                placeholder="Add a task and press Enter"
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/40"
              />
              <select
                value={taskDraft.priority}
                onChange={(event) => setTaskDraft((current) => ({ ...current, priority: event.target.value as Task["priority"] }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/40"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input
                type="date"
                value={taskDraft.dueDate}
                onChange={(event) => setTaskDraft((current) => ({ ...current, dueDate: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/40"
              />
              <select
                value={taskDraft.courseId}
                onChange={(event) => setTaskDraft((current) => ({ ...current, courseId: event.target.value }))}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400/40"
              >
                <option value="">Associate course</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.title}
                  </option>
                ))}
              </select>
              <button
                onClick={() => void createTask()}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
              >
                Add
              </button>
            </div>
          </div>

          <div className={viewMode === "grid" ? "grid gap-5 xl:grid-cols-2" : "space-y-5"}>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Pending Tasks</h4>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{pendingTasks.length}</span>
              </div>

              <div className={viewMode === "grid" ? "grid gap-3 md:grid-cols-2" : "space-y-3"}>
                {pendingTasks.map((task, index) => (
                  <div key={task.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white">
                    <div className="flex items-start gap-3">
                      <button onClick={() => void toggleTaskCompletion(task)} className="mt-1 rounded-full border border-slate-300 bg-white p-1 text-slate-500 transition hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Complete task">
                        <CircleCheckBig className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <h5 className="truncate text-sm font-semibold text-slate-900">{task.title}</h5>
                          <span className={[
                            "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                            task.priority === "high" ? "bg-rose-100 text-rose-700" : task.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700",
                          ].join(" ")}>{task.priority}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{task.description || "No description"}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{formatRelativeDueDate(task.dueDate)}</span>
                          {task.courseTitle ? <span>• {task.courseTitle}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button onClick={() => moveTask(task, -1)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Move up"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={() => moveTask(task, 1)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Move down"><ChevronRight className="h-4 w-4" /></button>
                      </div>
                      <button onClick={() => void deleteTask(task)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Delete task"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Completed Tasks</h4>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{completedTasks.length}</span>
              </div>

              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <div key={task.id} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => void toggleTaskCompletion(task)} className="mt-1 rounded-full border border-emerald-300 bg-white p-1 text-emerald-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-400/60" aria-label="Reopen task">
                        <Check className="h-4 w-4" />
                      </button>
                      <div className="min-w-0 flex-1">
                        <h5 className="text-sm font-semibold text-slate-900 line-through decoration-emerald-500/60">{task.title}</h5>
                        <p className="mt-1 text-sm text-slate-600">{task.description || "No description"}</p>
                      </div>
                      <button onClick={() => void toggleTaskArchive(task)} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400/60" aria-label="Archive task">
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {moduleTab === "calendar" ? (
        <section className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Monthly Calendar</h3>
                <p className="mt-1 text-sm text-slate-600">Deadlines update from backend events and open into a detail drawer.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setCalendarMonth(new Date())} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/60">Today</button>
                <select
                  value={calendarMonth.getMonth()}
                  onChange={(event) => setCalendarMonth((current) => new Date(current.getFullYear(), Number(event.target.value), 1))}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/40"
                  aria-label="Select month"
                >
                  {CALENDAR_MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
                <select
                  value={calendarMonth.getFullYear()}
                  onChange={(event) => setCalendarMonth((current) => new Date(Number(event.target.value), current.getMonth(), 1))}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/40"
                  aria-label="Select year"
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">{calendarMonthLabel}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              { ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => <div key={label} className="py-2">{label}</div>) }
            </div>

            <div className="mt-2 grid gap-2">
              {monthMatrix.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-2">
                  {week.map((day) => {
                    const dayEvents = eventsByDate.get(day.isoDate) ?? [];
                    const isSelected = selectedCalendarDate === day.isoDate;
                    const isCurrentWeek = currentWeekKeys.has(day.isoDate);

                    return (
                      <button
                        key={day.isoDate}
                        onClick={() => handleCalendarDaySelect(day)}
                        className={[
                          "min-h-28 rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-slate-400/60",
                          day.isCurrentMonth ? "border-slate-200" : "border-slate-100 bg-slate-100/60 text-slate-400",
                          day.isToday ? "bg-amber-50/80 border-amber-200" : isCurrentWeek ? "bg-slate-50/80" : "bg-white",
                          isSelected ? "shadow-inner ring-2 ring-slate-300/70" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between">
                          <span className={[
                            "text-sm font-medium",
                            day.isToday ? "text-slate-900" : "",
                          ].join(" ")}>{day.day}</span>
                          {dayEvents.length ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">{dayEvents.length}</span> : null}
                        </div>

                        <div className="mt-3 space-y-2">
                          {dayEvents.slice(0, 2).map((event) => (
                            <button
                              key={event.id}
                              onClick={(eventClick) => {
                                eventClick.stopPropagation();
                                setActiveEventId(event.id);
                              }}
                              className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400/60"
                            >
                              {event.title}
                            </button>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {selectedCalendarDate ? (
              <div ref={calendarNotePanelRef} className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Day note</p>
                    <h4 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                      {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${selectedCalendarDate}T00:00:00`))}
                    </h4>
                  </div>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                    {calendarDayNotes[selectedCalendarDate] ? "Saved locally" : "Quick note"}
                  </span>
                </div>

                <textarea
                  value={calendarDayNotes[selectedCalendarDate] ?? ""}
                  onChange={(event) => setCalendarDayNotes((current) => ({ ...current, [selectedCalendarDate]: event.target.value }))}
                  placeholder="Add a reminder, reflection, or study note for this day..."
                  className="mt-3 min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/40"
                />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {activeNote ? (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setActiveNoteId(null)} aria-label="Close note editor" />
          <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl transition-transform">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Deep Edit</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">{activeNote.title || "Untitled note"}</h3>
              </div>
              <button onClick={() => setActiveNoteId(null)} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Close panel"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 p-4" style={{ backgroundColor: activeNote.color }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600">Theme</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{NOTE_COVER_OPTIONS.find((cover) => cover.color === activeNote.color)?.label ?? "Custom"}</p>
                  </div>
                  <div className="relative">
                    <button onClick={() => setShowExpandedColorPicker((current) => !current)} className="rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400/60">
                      Change theme
                    </button>
                    {showExpandedColorPicker ? (
                      <div className="absolute right-0 top-12 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                        <div className="grid grid-cols-2 gap-2">
                          {NOTE_COVER_OPTIONS.map((cover) => (
                            <button
                              key={cover.id}
                              onClick={() => {
                                const nextNote = { ...activeNote, color: cover.color, updatedAt: new Date().toISOString() };
                                updateLocalNote(nextNote);
                                void saveNote(nextNote);
                                setShowExpandedColorPicker(false);
                              }}
                              className="rounded-2xl border border-slate-200 p-2 text-left transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <div className="h-12 rounded-xl border border-slate-100" style={{ background: cover.image }} />
                              <p className="mt-2 text-[11px] font-semibold text-slate-700">{cover.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <input
                value={expandedNoteTitle}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setExpandedNoteTitle(nextTitle);
                  const nextNote = { ...activeNote, title: nextTitle, updatedAt: new Date().toISOString() };
                  updateLocalNote(nextNote);
                }}
                onBlur={() => {
                  const nextNote = { ...activeNote, title: expandedNoteTitle, content: expandedNoteContent, updatedAt: new Date().toISOString() };
                  updateLocalNote(nextNote);
                  void saveNote(nextNote);
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/40"
              />

              <div className="flex flex-wrap gap-2">
                <button className={toolbarButtonClass(editorFormatState.bold)} onClick={() => handleRichFormat("bold", expandedNoteEditorRef)} aria-label="Bold"><Bold className="h-4 w-4" /></button>
                <button className={toolbarButtonClass(editorFormatState.italic)} onClick={() => handleRichFormat("italic", expandedNoteEditorRef)} aria-label="Italic"><Italic className="h-4 w-4" /></button>
                <button className={toolbarButtonClass(editorFormatState.underline)} onClick={() => handleRichFormat("underline", expandedNoteEditorRef)} aria-label="Underline"><Underline className="h-4 w-4" /></button>
                <button className={toolbarButtonClass(editorFormatState.strikeThrough)} onClick={() => handleRichFormat("strikeThrough", expandedNoteEditorRef)} aria-label="Strikethrough"><Strikethrough className="h-4 w-4" /></button>
                <button className={toolbarButtonClass(false)} onClick={() => handleRichFormat("code", expandedNoteEditorRef)} aria-label="Code"><Code2 className="h-4 w-4" /></button>
                <button className={toolbarButtonClass(editorFormatState.unorderedList)} onClick={() => handleListFormat("insertUnorderedList", expandedNoteEditorRef)} aria-label="Bulleted list"><ListTodo className="h-4 w-4" /></button>
                <button className={toolbarButtonClass(editorFormatState.unorderedList)} onClick={() => handleChecklist(expandedNoteEditorRef)} aria-label="Checklist"><CheckCheck className="h-4 w-4" /></button>
              </div>

              <div
                ref={expandedNoteEditorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={() => {
                  const nextContent = expandedNoteEditorRef.current?.innerHTML ?? "";
                  setExpandedNoteContent(nextContent);
                  updateEditorFormatState();
                }}
                onMouseUp={() => updateEditorFormatState()}
                onKeyUp={() => updateEditorFormatState()}
                onClick={() => updateEditorFormatState()}
                onBlur={() => {
                  const nextContent = expandedNoteEditorRef.current?.innerHTML ?? expandedNoteContent;
                  const nextNote = { ...activeNote, title: expandedNoteTitle, content: nextContent, updatedAt: new Date().toISOString() };
                  setExpandedNoteContent(nextContent);
                  updateLocalNote(nextNote);
                  void saveNote(nextNote);
                }}
                className="min-h-64 max-h-[calc(100vh-16rem)] overflow-y-auto overflow-x-hidden whitespace-pre-wrap rounded-3xl border border-slate-200 bg-white/70 p-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-400/40"
                style={{ backgroundColor: activeNote.color, scrollbarGutter: "stable" }}
                data-placeholder="Write your note here..."
              />
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void toggleNotePin(activeNote)} className="rounded-full border border-slate-200 px-4 py-2 text-sm">{activeNote.pinned ? "Unpin" : "Pin"}</button>
                <button onClick={() => void archiveNote(activeNote)} className="rounded-full border border-slate-200 px-4 py-2 text-sm">Archive</button>
                <button onClick={() => void deleteNote(activeNote)} className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-700">Delete</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeEvent ? (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity" onClick={() => setActiveEventId(null)} aria-label="Close event drawer" />
          <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Assignment Details</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">{activeEvent.title}</h3>
              </div>
              <button onClick={() => setActiveEventId(null)} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/60" aria-label="Close event panel"><X className="h-4 w-4" /></button>
            </div>

            <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Title</p>
                <p className="mt-1 text-sm text-slate-700">{activeEvent.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Description</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{activeEvent.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Professor</p>
                  <p className="mt-1 text-sm text-slate-700">{activeEvent.professorName || "TBD"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Max Points</p>
                  <p className="mt-1 text-sm text-slate-700">{activeEvent.maxPoints ?? "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Due</p>
                <p className="mt-1 text-sm text-slate-700">{new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" }).format(new Date(activeEvent.eventDate))}</p>
              </div>
              <a href={activeEvent.deepLink} className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400/60">
                Go to Assignment Submission
              </a>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}