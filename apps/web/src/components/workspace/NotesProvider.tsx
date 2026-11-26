"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Note } from "@/lib/lms-types";

const endpoint = "/api/workspace/notes";
type NoteFields = Pick<Note, "title" | "content" | "category" | "color" | "pinned" | "archived">;

async function request<T>(method: string, data?: object, url = endpoint): Promise<T> {
  const response = await fetch(url, {
    method,
    cache: "no-store",
    ...(data ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}),
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Sign in again to access your notes.");
    if (response.status === 404) throw new Error("This note could not be found.");
    if (response.status === 400) throw new Error("Check the note lengths and try again.");
    throw new Error("Could not reach Notes. Please try again.");
  }
  return response.json();
}

function useNotesState(userId?: string) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shortcutHidden, setShortcutHidden] = useState<boolean | null>(null);
  const shortcutKey = `cdm:notes-shortcut-hidden:v1:${userId ?? "default"}`;
  const loading = useRef<Promise<void> | null>(null);
  const writing = useRef<Promise<void> | null>(null);

  useEffect(() => {
    try {
      setShortcutHidden(localStorage.getItem(shortcutKey) === "true");
    } catch {
      setShortcutHidden(false);
    }
  }, [shortcutKey]);

  function setShortcutVisibility(visible: boolean) {
    setShortcutHidden(!visible);
    try {
      localStorage.setItem(shortcutKey, String(!visible));
    } catch { /* Apply the preference for this session. */ }
  }

  const load = useCallback(() => {
    if (loading.current) return loading.current;
    setLoadError("");
    const pending = Promise.resolve(writing.current).catch(() => undefined)
      .then(async () => setNotes(await request<Note[]>("GET")))
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Could not load notes."))
      .finally(() => { loading.current = null; });
    loading.current = pending;
    return pending;
  }, []);

  async function write(operation: () => Promise<void>) {
    if (writing.current) throw new Error("Another note is saving. Try again in a moment.");
    setBusy(true);
    const pending = Promise.resolve(loading.current).then(operation).finally(() => {
      writing.current = null;
      setBusy(false);
    });
    writing.current = pending;
    await pending;
  }

  async function save(fields: Partial<NoteFields>, id?: string) {
    await write(async () => {
      const saved = await request<Note>(id ? "PATCH" : "POST", id ? { ...fields, id } : fields);
      setNotes(current => {
        if (current === null) return null;
        return id ? current.map(note => note.id === id ? saved : note) : [saved, ...current];
      });
    });
  }

  async function remove(id: string) {
    await write(async () => {
      await request("DELETE", undefined, `${endpoint}?id=${encodeURIComponent(id)}`);
      setNotes(current => current?.filter(note => note.id !== id) ?? []);
    });
  }

  return { notes, load, loadError, busy, save, remove, shortcutHidden, setShortcutVisibility };
}

const NotesContext = createContext<ReturnType<typeof useNotesState> | null>(null);

export function NotesProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const state = useNotesState(userId);
  return <NotesContext.Provider value={state}>{children}</NotesContext.Provider>;
}

export function useNotes() {
  const notes = useContext(NotesContext);
  if (!notes) throw new Error("Notes must be inside the dashboard Notes provider.");
  return notes;
}
