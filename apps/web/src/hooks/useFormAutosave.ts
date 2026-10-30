"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readNativeDraft, writeNativeDraft } from '@/lib/native-draft';
import { useNativeDraftOwner } from './useNativeDraftOwner';

export interface AutosavePayload {
  questionId: string;
  answerText?: string | null;
  answerOptions?: string[] | null;
  answerNumber?: number | null;
  answerDate?: string | Date | null;
  answerRanking?: string[] | null;
  answerMatrix?: Record<string, string> | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSizeBytes?: number | null;
}

export function useFormAutosave(courseId: string, formId: string, attemptId: string, recovery?: { deadlineAt?: string | Date | null; status: string; onRecover: (answers: AutosavePayload[]) => void }) {
  const owner = useNativeDraftOwner();
  const draftKey = `assessment:${courseId}:${formId}:${attemptId}`;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState('');
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const versions = useRef(new Map<string, number>());
  const pending = useRef(new Map<string, AutosavePayload>());
  const outstanding = useRef(new Map<string, AutosavePayload>());
  const inFlight = useRef(new Set<Promise<void>>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const recovered = useRef('');
  useEffect(() => {
    if (!owner || recovered.current === owner || recovery?.status !== 'IN_PROGRESS') return;
    recovered.current = owner;
    // Recover answers only into the same live server attempt; never extend its deadline.
    if (recovery.deadlineAt && new Date(recovery.deadlineAt).getTime() <= Date.now()) return;
    const saved = readNativeDraft<AutosavePayload[]>(draftKey) ?? [];
    for (const answer of saved) { pending.current.set(answer.questionId, answer); outstanding.current.set(answer.questionId, answer); }
    if (saved.length) { recovery.onRecover(saved); setIsSaving(true); setSaveError('Recovered device answers · reconnect to save to the server.'); }
  }, [owner, draftKey, recovery]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (pending.current.size || inFlight.current.size) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => { window.removeEventListener('beforeunload', warn); for (const timer of timers.current.values()) clearTimeout(timer); };
  }, []);

  const send = useCallback((questionId: string) => {
    clearTimeout(timers.current.get(questionId)); timers.current.delete(questionId);
    const payload = pending.current.get(questionId);
    if (!payload) return Promise.resolve();
    pending.current.delete(questionId);
    const version = versions.current.get(questionId);
    const operation = queue.current.catch(() => {}).then(async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/forms/${formId}/attempts/${attemptId}/answers`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.message || 'Your answer could not be saved. Try again.');
        }
        setLastSavedAt(new Date()); setSaveError('');
        if (outstanding.current.get(questionId) === payload) outstanding.current.delete(questionId);
        if (!writeNativeDraft(draftKey, [...outstanding.current.values()])) setSaveError('Saved to server. Device draft storage is unavailable.');
      } catch (error) {
        if (versions.current.get(questionId) === version && !pending.current.has(questionId)) pending.current.set(questionId, payload);
        setSaveError(error instanceof Error ? error.message : 'Your answer could not be saved.');
        throw error;
      }
    });
    queue.current = operation;
    inFlight.current.add(operation);
    const settled = () => {
      inFlight.current.delete(operation);
      setIsSaving(pending.current.size > 0 || inFlight.current.size > 0);
    };
    operation.then(settled, settled);
    return operation;
  }, [courseId, formId, attemptId, draftKey]);

  const save = useCallback((payload: AutosavePayload) => {
    clearTimeout(timers.current.get(payload.questionId));
    versions.current.set(payload.questionId, (versions.current.get(payload.questionId) || 0) + 1);
    pending.current.set(payload.questionId, payload);
    outstanding.current.set(payload.questionId, payload);
    if (!writeNativeDraft(draftKey, [...outstanding.current.values()])) setSaveError('Device draft could not save. Keep this screen open until server autosave confirms.');
    setIsSaving(true);
    timers.current.set(payload.questionId, setTimeout(() => { void send(payload.questionId).catch(() => {}); }, 800));
  }, [send, draftKey]);

  const flush = useCallback(async () => {
    const operations = [...pending.current.keys()].map(questionId => send(questionId));
    await Promise.all([...inFlight.current, ...operations]);
  }, [send]);
  const hasPending = useCallback(() => pending.current.size > 0 || inFlight.current.size > 0, []);
  useEffect(() => {
    const resume = () => { if (!recovery || recovery.status === 'IN_PROGRESS' && (!recovery.deadlineAt || new Date(recovery.deadlineAt).getTime() > Date.now())) void flush().catch(() => {}); };
    window.addEventListener('online', resume);
    if (owner && navigator.onLine) resume();
    return () => window.removeEventListener('online', resume);
  }, [flush, owner, recovery]);
  return { save, flush, isSaving, lastSavedAt, saveError, hasPending };
}
