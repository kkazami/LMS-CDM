"use client";

import { useCallback, useRef, useState } from "react";

interface AutosavePayload {
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

export function useFormAutosave(courseId: string, formId: string, attemptId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState('');
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const versions = useRef(new Map<string, number>());
  const pending = useRef(new Map<string, AutosavePayload>());
  const inFlight = useRef(new Set<Promise<void>>());
  const queue = useRef<Promise<void>>(Promise.resolve());

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
  }, [courseId, formId, attemptId]);

  const save = useCallback((payload: AutosavePayload) => {
    clearTimeout(timers.current.get(payload.questionId));
    versions.current.set(payload.questionId, (versions.current.get(payload.questionId) || 0) + 1);
    pending.current.set(payload.questionId, payload);
    setIsSaving(true);
    timers.current.set(payload.questionId, setTimeout(() => { void send(payload.questionId).catch(() => {}); }, 800));
  }, [send]);

  const flush = useCallback(async () => {
    const operations = [...pending.current.keys()].map(questionId => send(questionId));
    await Promise.all([...inFlight.current, ...operations]);
  }, [send]);
  const hasPending = useCallback(() => pending.current.size > 0 || inFlight.current.size > 0, []);
  return { save, flush, isSaving, lastSavedAt, saveError, hasPending };
}
