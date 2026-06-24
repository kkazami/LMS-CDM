"use client";

import { useEffect, useRef, useState } from "react";
import {
  Archive,
  Bold,
  CheckSquare,
  Code2,
  Italic,
  List,
  ListChecks,
  Palette,
  Pin,
  Save,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import type { Note } from "@/lib/lms-types";
import { cn } from "@/lib/utils";

type NotesModuleProps = {
  initialNotes: Note[];
};

const colorThemes = [
  { label: "Paper", value: "#ffffff" },
  { label: "Sand", value: "#fef3c7" },
  { label: "Mint", value: "#dcfce7" },
  { label: "Sky", value: "#dbeafe" },
  { label: "Rose", value: "#ffe4e6" },
  { label: "Slate", value: "#e2e8f0" },
];

const categoryOptions = ["General", "Lecture", "Reading", "Project", "Revision"];

function sortNotes(notes: Note[]) {
  return [...notes].sort((left, right) => {
    if (left.pinned !== right.pinned) return Number(right.pinned) - Number(left.pinned);
    if (left.archived !== right.archived) return Number(left.archived) - Number(right.archived);
    return left.orderIndex - right.orderIndex;
  });
}

function reorderNotes(notes: Note[], fromId: string, toId: string) {
  const ordered = sortNotes(notes.filter((note) => !note.archived));
  const fromIndex = ordered.findIndex((note) => note.id === fromId);
  const toIndex = ordered.findIndex((note) => note.id === toId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return notes;
  }

  const next = [...ordered];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  const orderMap = new Map(next.map((note, index) => [note.id, index]));

  return notes.map((note) => {
    const orderIndex = orderMap.get(note.id);
    return typeof orderIndex === "number" ? { ...note, orderIndex } : note;
  });
}

async function persistNote(note: Note) {
  await fetch("/api/workspace/notes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
}

async function deleteNoteById(id: string) {
  await fetch(`/api/workspace/notes?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export default function NotesModule({ initialNotes }: NotesModuleProps) {
  const [notes, setNotes] = useState(sortNotes(initialNotes));
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerTitle, setComposerTitle] = useState("");
  const [composerContent, setComposerContent] = useState("");
  const [composerCategory, setComposerCategory] = useState(categoryOptions[0]);
  const [composerColor, setComposerColor] = useState(colorThemes[0].value);
  const [showArchived, setShowArchived] = useState(false);
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editorNote, setEditorNote] = useState<Note | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorCategory, setEditorCategory] = useState(categoryOptions[0]);
  const [editorColor, setEditorColor] = useState(colorThemes[0].value);
  const [editorPinned, setEditorPinned] = useState(false);
  const [editorArchived, setEditorArchived] = useState(false);
  const [editorHtml, setEditorHtml] = useState("");
  const [editorId, setEditorId] = useState<string | null>(null);

  const notesRef = useRef(notes);
  const editorRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!editorVisible || !editorNote || !editorRef.current) return;
    editorRef.current.innerHTML = editorHtml || editorNote.content;
  }, [editorVisible, editorNote, editorHtml]);

  const visibleNotes = sortNotes(notes.filter((note) => showArchived || !note.archived));
  const activeCount = notes.filter((note) => !note.archived).length;
  const archivedCount = notes.filter((note) => note.archived).length;

  function updateLocalNotes(nextNotes: Note[]) {
    setNotes(sortNotes(nextNotes));
    notesRef.current = sortNotes(nextNotes);
  }

  async function createNote() {
    const title = composerTitle.trim();
    const content = composerContent.trim();

    if (!title && !content) {
      return;
    }

    const tempId = globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`;
    const tempNote: Note = {
      id: tempId,
      title: title || "Untitled note",
      content,
      category: composerCategory,
      color: composerColor,
      pinned: false,
      archived: false,
      orderIndex: notesRef.current.length,
      creatorId: "temp",
      instituteId: "temp",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateLocalNotes([tempNote, ...notesRef.current]);
    setComposerTitle("");
    setComposerContent("");
    setComposerCategory(categoryOptions[0]);
    setComposerColor(colorThemes[0].value);
    setComposerOpen(false);

    try {
      const response = await fetch("/api/workspace/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: tempNote.title,
          content: tempNote.content,
          category: tempNote.category,
          color: tempNote.color,
          pinned: tempNote.pinned,
          archived: tempNote.archived,
          orderIndex: tempNote.orderIndex,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create note.");
      }

      const created = (await response.json()) as Note;
      updateLocalNotes([created, ...notesRef.current.filter((note) => note.id !== tempId)]);
    } catch (error) {
      updateLocalNotes(notesRef.current.filter((note) => note.id !== tempId));
    }
  }

  async function patchNote(id: string, updater: (note: Note) => Note) {
    const previous = notesRef.current;
    const updated = previous.map((note) => (note.id === id ? updater(note) : note));
    updateLocalNotes(updated);

    try {
      const nextNote = updated.find((note) => note.id === id);

      if (!nextNote) return;

      await persistNote(nextNote);
    } catch (error) {
      updateLocalNotes(previous);
    }
  }

  async function removeNote(id: string) {
    const previous = notesRef.current;
    updateLocalNotes(previous.filter((note) => note.id !== id));

    try {
      await deleteNoteById(id);
    } catch (error) {
      updateLocalNotes(previous);
    }
  }

  function openEditor(note: Note) {
    setEditorNote(note);
    setEditorId(note.id);
    setEditorTitle(note.title);
    setEditorCategory(note.category);
    setEditorColor(note.color);
    setEditorPinned(note.pinned);
    setEditorArchived(note.archived);
    setEditorHtml(note.content);
    setEditorVisible(true);

    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
    }
  }

  function closeEditor() {
    setEditorVisible(false);
    hideTimerRef.current = window.setTimeout(() => {
      setEditorNote(null);
      setEditorId(null);
    }, 220);
  }

  function applyFormatting(command: string, value?: string) {
    const editor = editorRef.current;

    if (!editor) return;

    editor.focus();

    if (command === "insertHTML" && value) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false, value);
    }

    setEditorHtml(editor.innerHTML);
  }

  function handleDragStart(noteId: string) {
    setDraggedNoteId(noteId);
  }

  function handleDrop(targetNoteId: string) {
    if (!draggedNoteId || draggedNoteId === targetNoteId) {
      setDraggedNoteId(null);
      return;
    }

    const reordered = reorderNotes(notesRef.current, draggedNoteId, targetNoteId);
    updateLocalNotes(reordered);

    const orderedVisible = sortNotes(reordered.filter((note) => !note.archived));

    void Promise.all(
      orderedVisible.map((note, index) =>
        persistNote({
          ...note,
          orderIndex: index,
        })
      )
    );

    setDraggedNoteId(null);
  }

  function renderNoteCard(note: Note) {
    return (
      <article
        key={note.id}
        draggable
        onDragStart={() => handleDragStart(note.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => handleDrop(note.id)}
        onClick={() => openEditor(note)}
        className={cn(
          "group relative cursor-pointer overflow-hidden rounded-3xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg",
          draggedNoteId === note.id && "scale-[0.98] opacity-70"
        )}
        style={{ backgroundColor: note.color }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <span className="inline-flex rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
              {note.category}
            </span>
            <h3 className="text-base font-semibold text-slate-900">{note.title || "Untitled note"}</h3>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void patchNote(note.id, (current) => ({ ...current, pinned: !current.pinned }));
            }}
            className={cn(
              "rounded-full border p-2 transition focus:outline-none focus:ring-2 focus:ring-sky-400",
              note.pinned ? "border-sky-300 bg-sky-100 text-sky-700" : "border-transparent bg-white/70 text-slate-400"
            )}
            aria-label={note.pinned ? "Unpin note" : "Pin note"}
          >
            <Pin className="h-4 w-4" />
          </button>
        </div>

        <div
          className="line-clamp-5 text-sm leading-6 text-slate-700"
          dangerouslySetInnerHTML={{ __html: note.content || "<p>Open to add details.</p>" }}
        />

        <div className="mt-4 flex items-center justify-between gap-2 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void patchNote(note.id, (current) => ({ ...current, archived: !current.archived }));
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <Archive className="h-3.5 w-3.5" />
            {note.archived ? "Restore" : "Archive"}
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void removeNote(note.id);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </article>
    );
  }

  const editorMarkup = editorHtml || editorNote?.content || "";

  return (
    <section className="space-y-6 rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Notes</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Keep-style study notes</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Capture quick thoughts, pin what matters, and keep editing friction low with a clean expanded note view.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">{activeCount} active</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">{archivedCount} archived</span>
        </div>
      </div>

      <div className={cn("rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300", composerOpen && "ring-2 ring-sky-400/30") }>
        <div className="flex items-center gap-3">
          <input
            value={composerTitle}
            onChange={(event) => setComposerTitle(event.target.value)}
            onFocus={() => setComposerOpen(true)}
            placeholder="Take a note..."
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />

          <button
            type="button"
            onClick={() => setComposerOpen((value) => !value)}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
            aria-label={composerOpen ? "Collapse composer" : "Expand composer"}
          >
            <Palette className="h-4 w-4" />
          </button>
        </div>

        <div className={cn("grid overflow-hidden transition-all duration-300", composerOpen ? "mt-4 grid-rows-[1fr]" : "grid-rows-[0fr]") }>
          <div className="min-h-0 space-y-4">
            <textarea
              value={composerContent}
              onChange={(event) => setComposerContent(event.target.value)}
              rows={3}
              placeholder="Add a quick detail, a quote, or a checklist starter..."
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setComposerCategory(option)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400",
                      composerCategory === option
                        ? "border-sky-200 bg-sky-50 text-sky-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {colorThemes.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    title={theme.label}
                    onClick={() => setComposerColor(theme.value)}
                    className={cn(
                      "h-8 w-8 rounded-full border transition focus:outline-none focus:ring-2 focus:ring-sky-400",
                      composerColor === theme.value ? "border-slate-900" : "border-slate-200"
                    )}
                    style={{ backgroundColor: theme.value }}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => void createNote()}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                >
                  <Save className="h-4 w-4" />
                  Save note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" />
          Drag cards to reorder your study stack.
        </div>

        <button
          type="button"
          onClick={() => setShowArchived((value) => !value)}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleNotes.map((note) => renderNoteCard(note))}

        {visibleNotes.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No notes yet. Start with a quick thought or a lecture highlight.
          </div>
        ) : null}
      </div>

      {editorNote && editorId ? (
        <div
          className={cn(
            "fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 transition-all duration-200",
            editorVisible ? "opacity-100 backdrop-blur-sm" : "pointer-events-none opacity-0"
          )}
          onClick={closeEditor}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            className={cn(
              "flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl transition-transform duration-200",
              editorVisible ? "translate-y-0 scale-100" : "translate-y-3 scale-[0.98]"
            )}
            style={{ backgroundColor: editorColor }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-black/5 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Deep edit</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{editorTitle || "Untitled note"}</h3>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
                aria-label="Close editor"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-black/5 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <EditorButton onClick={() => applyFormatting("bold")} icon={<Bold className="h-4 w-4" />} />
                <EditorButton onClick={() => applyFormatting("italic")} icon={<Italic className="h-4 w-4" />} />
                <EditorButton onClick={() => applyFormatting("underline")} icon={<Underline className="h-4 w-4" />} />
                <EditorButton onClick={() => applyFormatting("strikeThrough")} icon={<Strikethrough className="h-4 w-4" />} />
                <EditorButton
                  onClick={() =>
                    applyFormatting(
                      "insertHTML",
                      "<code class='rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-white'>code</code>"
                    )
                  }
                  icon={<Code2 className="h-4 w-4" />}
                />
                <EditorButton onClick={() => applyFormatting("insertUnorderedList")} icon={<List className="h-4 w-4" />} />
                <EditorButton
                  onClick={() =>
                    applyFormatting(
                      "insertHTML",
                      "<ul class='list-none space-y-2'><li class='flex items-start gap-2'><input type='checkbox' class='mt-1 h-4 w-4 rounded border-slate-300 text-sky-500' /><span>Checklist item</span></li></ul>"
                    )
                  }
                  icon={<ListChecks className="h-4 w-4" />}
                />
                <EditorButton
                  onClick={() =>
                    applyFormatting(
                      "insertHTML",
                      "<span class='inline-flex items-center gap-2 rounded-full bg-slate-900 px-2 py-1 text-xs font-medium text-white'><input type='checkbox' checked disabled class='h-3.5 w-3.5 rounded border-white/40 text-white' />Done</span>"
                    )
                  }
                  icon={<CheckSquare className="h-4 w-4" />}
                />
              </div>
            </div>

            <div className="grid gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-4">
                <input
                  value={editorTitle}
                  onChange={(event) => setEditorTitle(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                  placeholder="Note title"
                />

                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(event) => setEditorHtml((event.currentTarget as HTMLDivElement).innerHTML)}
                  className="min-h-[320px] rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                />
                <p className="text-xs text-slate-500">
                  Rich text stays local until you press save, so the UI remains instant even on slower networks.
                </p>
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Category</label>
                  <select
                    value={editorCategory}
                    onChange={(event) => setEditorCategory(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Theme</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setEditorColor(theme.value)}
                        className={cn(
                          "h-12 rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-sky-400",
                          editorColor === theme.value ? "border-slate-900" : "border-slate-200"
                        )}
                        style={{ backgroundColor: theme.value }}
                        aria-label={theme.label}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditorPinned((value) => !value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400",
                    editorPinned ? "border-sky-200 bg-sky-50 text-sky-700" : "border-slate-200 bg-slate-50 text-slate-600"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Pin className="h-4 w-4" />
                    Pinned
                  </span>
                  <span>{editorPinned ? "On" : "Off"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorArchived((value) => !value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-400",
                    editorArchived ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-slate-50 text-slate-600"
                  )}
                >
                  <span className="inline-flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    Archived
                  </span>
                  <span>{editorArchived ? "Yes" : "No"}</span>
                </button>

                <div className="space-y-2 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!editorNote) return;

                      const nextNote: Note = {
                        ...editorNote,
                        title: editorTitle.trim() || "Untitled note",
                        content: editorRef.current?.innerHTML || editorHtml,
                        category: editorCategory,
                        color: editorColor,
                        pinned: editorPinned,
                        archived: editorArchived,
                      };

                      const previous = notesRef.current;
                      updateLocalNotes(previous.map((note) => (note.id === editorNote.id ? nextNote : note)));

                      try {
                        await persistNote({
                          ...nextNote,
                          orderIndex: editorNote.orderIndex,
                        });
                        closeEditor();
                      } catch (error) {
                        updateLocalNotes(previous);
                      }
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <Save className="h-4 w-4" />
                    Save changes
                  </button>

                  <button
                    type="button"
                    onClick={() => editorId && void removeNote(editorId).then(closeEditor)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        @keyframes notePulse {
          0% {
            transform: scale(0.95);
            opacity: 0.2;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}

function EditorButton({
  icon,
  onClick,
}: {
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
    >
      {icon}
    </button>
  );
}