"use client";

import { Archive, ArchiveRestore, Check, LayoutGrid, List, ListChecks, NotebookPen, Pin, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import type { Note } from "@/lib/lms-types";
import NoteEditor from "./NoteEditor";
import { noteColorStyle, readNoteContent, writeChecklist } from "./note-content";
import { useNotes } from "./NotesProvider";
import styles from "./notes.module.css";

type Editor = { note?: Note; checklist: boolean };

export default function NotesBoard({ compact = false, active = true }: { compact?: boolean; active?: boolean }) {
  const { notes, load, loadError, busy, save, remove, shortcutHidden, setShortcutVisibility } = useNotes();
  const [search, setSearch] = useState("");
  const [label, setLabel] = useState("");
  const [archived, setArchived] = useState(false);
  const [listView, setListView] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pendingColor, setPendingColor] = useState<{ id: string; color: string } | null>(null);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const editorOpener = useRef<HTMLButtonElement | null>(null);
  const composer = useRef<HTMLButtonElement>(null);
  const labelFilterId = useId();

  useEffect(() => {
    if (notes === null && !loadError) void load();
  }, [notes, loadError, load]);

  useEffect(() => {
    if (!active) setDeleting(null);
  }, [active]);

  const cards = useMemo(() => (notes ?? []).map(note => ({ note, ...readNoteContent(note.content) })), [notes]);
  const labels = useMemo(() => [...new Set(["Class Notes", "Homework", "Reading", "Exam Prep", "Ideas", ...cards.map(({ note }) => note.category).filter(Boolean)])].sort(), [cards]);
  const query = search.trim().toLocaleLowerCase();
  const visible = cards.filter(({ note, text }) => note.archived === archived && (!label || note.category === label) && (
    !query || [note.title, note.category, text].some(value => value.toLocaleLowerCase().includes(query))
  )).sort((a, b) => a.note.orderIndex - b.note.orderIndex || b.note.updatedAt.localeCompare(a.note.updatedAt));
  const pinned = archived ? [] : visible.filter(({ note }) => note.pinned);
  const others = archived ? visible : visible.filter(({ note }) => !note.pinned);
  const originalNote = editor?.note;
  const editedNote = originalNote && (notes?.find(note => note.id === originalNote.id) ?? originalNote);

  function displayColor(note: Note) {
    return pendingColor?.id === note.id ? pendingColor.color : note.color;
  }

  async function changeColor(id: string, color: string) {
    setPendingColor({ id, color });
    try {
      await save({ color }, id);
    } finally {
      setPendingColor(null);
    }
  }

  function openEditor(next: Editor, opener: HTMLButtonElement) {
    editorOpener.current = opener;
    setEditor(next);
    setMessage("");
  }

  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => {
      const opener = editorOpener.current;
      (opener?.isConnected ? opener : composer.current)?.focus();
    });
  }

  async function changeNote(operation: () => Promise<void>, success: string) {
    setError("");
    setMessage("");
    try {
      await operation();
      setMessage(success);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not update the note.");
    }
  }

  function renderCards(items: typeof visible, heading?: string) {
    if (!items.length) return null;
    return (
      <section className={styles.collection} aria-label={heading ?? (archived ? "Archived notes" : "Notes collection")}>
        {heading && <h2>{heading}</h2>}
        <div className={styles.cards} data-list={compact || listView} data-sparse={items.length <= 4}>
          {items.map(({ note, text, checklist }) => (
            <article key={note.id} className={styles.card} style={noteColorStyle(displayColor(note))}>
              <div className={styles.cardTop}>
                <button type="button" className={styles.cardTitle} aria-label={`Edit ${note.title || "untitled note"}`} onClick={event => openEditor({ note, checklist: false }, event.currentTarget)}>
                  <span>{note.title || "Untitled note"}</span>
                  {!checklist && text && <span className={styles.preview}>{text}</span>}
                </button>
                {!archived && <button type="button" className={styles.iconButton} aria-label={`${note.pinned ? "Unpin" : "Pin"} ${note.title || "note"}`} title={note.pinned ? "Unpin note" : "Pin note"} aria-pressed={note.pinned} disabled={busy} onClick={() => void changeNote(() => save({ pinned: !note.pinned }, note.id), note.pinned ? "Note unpinned." : "Note pinned.")}><Pin size={16} fill={note.pinned ? "currentColor" : "none"} /></button>}
              </div>
              {checklist ? (
                <ul className={styles.cardChecklist}>
                  {checklist.slice(0, 5).map((item, index) => <li key={index}>
                    <label>
                      <input type="checkbox" checked={item.checked} disabled={busy || archived} onChange={event => {
                        const next = checklist.map((entry, position) => index === position ? { ...entry, checked: event.target.checked } : entry);
                        void changeNote(() => save({ content: writeChecklist(next) }, note.id), "Checklist updated.");
                      }} />
                      <span>{item.text}</span>
                    </label>
                  </li>)}
                  {checklist.length > 5 && <li className={styles.moreItems}>+{checklist.length - 5} more</li>}
                </ul>
              ) : null}
              <footer className={styles.cardFooter}>
                <span title={note.category} className={styles.label}>{note.category || "General"}</span>
                <div className={styles.cardActions}>
                  <button type="button" className={styles.iconButton} title={archived ? "Restore note" : "Archive note"} aria-label={`${archived ? "Restore" : "Archive"} ${note.title || "note"}`} disabled={busy} onClick={() => void changeNote(() => save({ archived: !archived }, note.id), archived ? "Note restored." : "Note archived.")}>
                    {archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                  <button type="button" className={styles.iconButton} title="Delete note" aria-label={`Delete ${note.title || "note"}`} disabled={busy} onClick={() => { setError(""); setDeleting(note); }}><Trash2 size={16} /></button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className={styles.board} data-compact={compact}>
      {!compact && shortcutHidden && (
        <div>
          <button type="button" className={styles.textButton} onClick={() => {
            setShortcutVisibility(true);
            setMessage("Quick Notes shortcut will show on other pages.");
            composer.current?.focus();
          }}>Show Quick Notes shortcut</button>
        </div>
      )}
      {editor ? <NoteEditor
        key={originalNote?.id ?? (editor.checklist ? "checklist" : "note")}
        note={originalNote}
        checklist={editor.checklist}
        labels={labels}
        busy={busy}
        savedColor={editedNote && displayColor(editedNote)}
        colorPending={pendingColor !== null && pendingColor.id === editedNote?.id}
        onColorChange={editedNote ? color => changeColor(editedNote.id, color) : undefined}
        onCancel={closeEditor}
        onSave={async draft => {
          if (originalNote) {
            const fields = {
              ...(draft.title !== originalNote.title ? { title: draft.title } : {}),
              ...(draft.content !== originalNote.content ? { content: draft.content } : {}),
              ...(draft.category !== originalNote.category ? { category: draft.category } : {}),
            };
            if (Object.keys(fields).length) await save(fields, originalNote.id);
          } else {
            await save(draft);
            setArchived(false);
            setLabel("");
            setSearch("");
          }
          setMessage("Note saved.");
          closeEditor();
        }}
      /> : <div className={styles.capture}>
        <button ref={composer} type="button" className={styles.captureButton} disabled={notes === null || busy} onClick={event => openEditor({ checklist: false }, event.currentTarget)}><span className={styles.captureIcon}><Plus size={19} /></span> Take a note</button>
        <button type="button" className={styles.iconButton} disabled={notes === null || busy} title="New checklist" aria-label="New checklist" onClick={event => openEditor({ checklist: true }, event.currentTarget)}><ListChecks size={21} /></button>
      </div>}

      <div className={styles.toolbar}>
        <label className={styles.search}><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} aria-label="Search notes" placeholder="Search your notes" type="search" /></label>
        <div className={styles.filters}>
          <div className={styles.sections} role="group" aria-label="Note folders">
            <button type="button" aria-pressed={!archived} onClick={() => setArchived(false)}>Notes</button>
            <button type="button" aria-pressed={archived} onClick={() => setArchived(true)}>Archive</button>
          </div>
          <label htmlFor={labelFilterId} className="sr-only">Filter by label</label>
          <select id={labelFilterId} className={styles.labelFilter} value={label} onChange={event => setLabel(event.target.value)}>
            <option value="">All labels</option>
            {labels.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          {!compact && <button type="button" className={styles.iconButton} aria-label={listView ? "Switch to card view" : "Switch to list view"} title={listView ? "Card view" : "List view"} onClick={() => setListView(value => !value)}>{listView ? <LayoutGrid size={18} /> : <List size={19} />}</button>}
        </div>
      </div>

      {message && <p className={styles.status} role="status"><Check size={15} /> {message}</p>}
      {error && !deleting && <p className={styles.error} role="alert">{error}</p>}
      {loadError ? <div className={styles.empty}><p role="alert">{loadError}</p><button type="button" className={styles.textButton} onClick={() => void load()}>Try again</button></div> : notes === null ? <p className={styles.empty} role="status">Loading notes…</p> : !visible.length ? (
        <div className={styles.empty}><NotebookPen size={25} /><p>{query || label ? "No notes match your filters." : archived ? "No archived notes." : "Your notebook is empty."}</p>
          {!query && !label && !archived && <span>Take a note or start a checklist.</span>}
          {(query || label) && <button type="button" className={styles.textButton} onClick={() => { setSearch(""); setLabel(""); }}>Clear filters</button>}
        </div>
      ) : <>{renderCards(pinned, "Pinned")}{renderCards(others, pinned.length ? "Other notes" : undefined)}</>}

      {active && deleting && createPortal(<div className={styles.confirmLayer}><ConfirmDialog title="Delete note?" description={`“${deleting.title || "Untitled note"}” will be permanently deleted.`} onClose={() => { if (!busy) setDeleting(null); }}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <div className={styles.editorActions}>
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => setDeleting(null)}>Cancel</button>
          <button type="button" className={styles.dangerButton} disabled={busy} onClick={() => void changeNote(async () => { await remove(deleting.id); setDeleting(null); }, "Note deleted.")}>{busy ? "Deleting…" : "Delete note"}</button>
        </div>
      </ConfirmDialog></div>, document.body)}
    </div>
  );
}
