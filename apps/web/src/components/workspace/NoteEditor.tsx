"use client";

import { Bold, Code2, Italic, List, ListOrdered, Plus, Strikethrough, Underline, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import type { Note } from "@/lib/lms-types";
import { pastePlainText } from "@/lib/plain-text-paste";
import { noteColorStyle, readNoteContent, writeChecklist, type ChecklistItem } from "./note-content";
import styles from "./notes.module.css";

const colors = [
  ["Paper", "#ffffff"], ["Honey", "#fef3c7"], ["Sky", "#dbeafe"],
  ["Mint", "#dcfce7"], ["Rose", "#fce7f3"], ["Lilac", "#ede9fe"],
];
const formats = [
  ["Bold", Bold, "bold"], ["Italic", Italic, "italic"], ["Underline", Underline, "underline"],
  ["Strikethrough", Strikethrough, "strikeThrough"], ["Code block", Code2, "formatBlock", "pre"],
  ["Bulleted list", List, "insertUnorderedList"], ["Numbered list", ListOrdered, "insertOrderedList"],
] as const;

type Draft = Pick<Note, "title" | "content" | "category" | "color">;
const blankItem = { text: "", checked: false };

function dropPlainText(event: DragEvent<HTMLDivElement>) {
  event.preventDefault();
  const text = event.dataTransfer.getData("text/plain");
  if (!text) return;

  const editor = event.currentTarget;
  const doc = editor.ownerDocument;
  const position = doc.caretPositionFromPoint?.(event.clientX, event.clientY);
  const range = position ? doc.createRange() : doc.caretRangeFromPoint?.(event.clientX, event.clientY) ?? doc.createRange();
  if (position) range.setStart(position.offsetNode, position.offset);
  if (editor.contains(range.startContainer)) range.collapse(true);
  else {
    range.selectNodeContents(editor);
    range.collapse(false);
  }

  editor.focus({ preventScroll: true });
  const selection = doc.getSelection();
  if (!selection) return;
  selection.removeAllRanges();
  selection.addRange(range);
  doc.execCommand("insertText", false, text);
}

export default function NoteEditor({ note, checklist, labels, busy, savedColor, colorPending, onColorChange, onSave, onCancel }: {
  note?: Note;
  checklist: boolean;
  labels: string[];
  busy: boolean;
  savedColor?: string;
  colorPending: boolean;
  onColorChange?: (color: string) => Promise<void>;
  onSave: (draft: Draft) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [category, setCategory] = useState(note?.category ?? "");
  const [draftColor, setDraftColor] = useState(colors[0][1]);
  const color = savedColor ?? draftColor;
  const [items, setItems] = useState<ChecklistItem[] | null>(() => {
    if (note) return readNoteContent(note.content).checklist;
    return checklist ? [blankItem] : null;
  });
  const [error, setError] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const addItemFocus = useRef(false);
  const lastItem = useRef<HTMLInputElement>(null);
  const labelOptions = useId();

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = note?.content ?? "";
    titleRef.current?.focus();
  }, [note?.id]);

  useEffect(() => {
    if (!addItemFocus.current) return;
    addItemFocus.current = false;
    lastItem.current?.focus();
  }, [items?.length]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const content = items ? writeChecklist(items) : (editorRef.current?.innerHTML ?? "");
    if (!title.trim() && !readNoteContent(content).text) {
      setError("Add a title or write something before saving.");
      return;
    }
    setError("");
    try {
      await onSave({ title: title.trim(), content, category: category.trim() || "General", color });
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not save the note.");
    }
  }

  async function selectColor(value: string) {
    if (busy || color.toLowerCase() === value) return;
    setError("");
    if (!onColorChange) {
      setDraftColor(value);
      return;
    }
    try {
      await onColorChange(value);
    } catch {
      setError("Could not save the color. Choose it again to retry.");
    }
  }

  function updateItem(index: number, change: Partial<ChecklistItem>) {
    setItems(current => current?.map((item, position) => position === index ? { ...item, ...change } : item) ?? null);
  }

  return (
    <form className={styles.editor} style={noteColorStyle(color)} onSubmit={submit} aria-label={note ? "Edit note" : "Create note"} onKeyDown={event => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.requestSubmit();
      }
    }}>
      <input ref={titleRef} className={styles.noteTitle} aria-label="Note title" placeholder="Title" maxLength={200} value={title} onChange={event => setTitle(event.target.value)} />
      {items ? (
        <div className={styles.checklistEditor}>
          {items.map((item, index) => (
            <div className={styles.checklistRow} key={index}>
              <input type="checkbox" aria-label={`Mark item ${index + 1} complete`} checked={item.checked} onChange={event => updateItem(index, { checked: event.target.checked })} />
              <input ref={index === items.length - 1 ? lastItem : undefined} aria-label={`Checklist item ${index + 1}`} placeholder="List item" value={item.text} onChange={event => updateItem(index, { text: event.target.value })} onKeyDown={event => {
                if (event.key !== "Enter" || event.ctrlKey || event.metaKey) return;
                event.preventDefault();
                addItemFocus.current = true;
                setItems(current => [...(current ?? []), blankItem]);
              }} />
              <button type="button" className={styles.iconButton} aria-label={`Remove item ${index + 1}`} onClick={() => setItems(current => current?.filter((_, position) => position !== index) ?? [])}><X size={16} /></button>
            </div>
          ))}
          <button type="button" className={styles.textButton} onClick={() => {
            addItemFocus.current = true;
            setItems(current => [...(current ?? []), blankItem]);
          }}><Plus size={16} /> Add item</button>
        </div>
      ) : (
        <>
          <div ref={editorRef} className={styles.richText} contentEditable suppressContentEditableWarning role="textbox" aria-label="Note body" aria-multiline="true" data-placeholder="Write a note…" onPaste={pastePlainText} onDrop={dropPlainText} onDragOver={event => {
            if (!event.dataTransfer.types.includes("text/plain")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }} />
          <div className={styles.formatting} role="group" aria-label="Text formatting">
            {formats.map(([label, Icon, command, value]) => <button key={command} type="button" className={styles.iconButton} title={label} aria-label={label} onMouseDown={event => event.preventDefault()} onClick={() => {
              editorRef.current?.focus();
              document.execCommand(command, false, value);
            }}><Icon size={16} /></button>)}
          </div>
        </>
      )}
      <div className={styles.noteOptions}>
        <input list={labelOptions} value={category} onChange={event => setCategory(event.target.value)} aria-label="Note label" placeholder="Add a label" maxLength={100} />
        <datalist id={labelOptions}>{labels.map(label => <option key={label} value={label} />)}</datalist>
        <div className={styles.swatches} role="group" aria-label="Note color" aria-busy={colorPending}>
          {colors.map(([label, value]) => <button key={value} type="button" className={styles.swatch} title={label} aria-label={`${label} color`} aria-pressed={color.toLowerCase() === value} style={{ background: value }} disabled={busy} onClick={() => void selectColor(value)} />)}
        </div>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <div className={styles.editorActions}>
        <button type="button" className={styles.textButton} disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="submit" className={styles.primaryButton} disabled={busy}>{busy && !colorPending ? "Saving…" : "Save note"}</button>
      </div>
    </form>
  );
}
