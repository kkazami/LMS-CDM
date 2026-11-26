"use client";

import { useState, type FormEvent } from "react";
import { useNotes } from "./NotesProvider";
import styles from "./notes-dock.module.css";

export default function MobileQuickNote() {
  const { busy, save } = useNotes();
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; error: boolean } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setFeedback(null);
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    try {
      await save({ content: paragraph.outerHTML });
      setDraft("");
      setFeedback({ message: "Saved to Notes.", error: false });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Could not save the note.", error: true });
    }
  }

  return (
    <form className={styles.quickForm} onSubmit={submit} aria-label="Take a quick note">
      <textarea aria-label="Note body" placeholder="Write a note…" value={draft} maxLength={16000} readOnly={busy} onChange={event => {
        setDraft(event.target.value);
        setFeedback(null);
      }} />
      <div className={styles.quickFooter}>
        {feedback && <span role={feedback.error ? "alert" : "status"} data-error={feedback.error || undefined}>{feedback.message}</span>}
        <button type="submit" disabled={busy || !draft.trim()}>{busy ? "Saving…" : "Save note"}</button>
      </div>
    </form>
  );
}
