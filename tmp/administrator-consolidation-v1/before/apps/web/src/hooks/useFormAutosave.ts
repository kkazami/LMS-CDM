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
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});
  const inFlightCountRef = useRef(0);

  const save = useCallback(
    (payload: AutosavePayload) => {
      const qId = payload.questionId;
      if (timeoutsRef.current[qId]) {
        clearTimeout(timeoutsRef.current[qId]);
      }

      setIsSaving(true);
      inFlightCountRef.current++;

      timeoutsRef.current[qId] = setTimeout(async () => {
        try {
          await fetch(`/api/courses/${courseId}/forms/${formId}/attempts/${attemptId}/answers`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          setLastSavedAt(new Date());
        } catch (err) {
          console.error("Autosave error:", err);
        } finally {
          inFlightCountRef.current = Math.max(0, inFlightCountRef.current - 1);
          if (inFlightCountRef.current === 0) {
            setIsSaving(false);
          }
        }
      }, 800);
    },
    [courseId, formId, attemptId]
  );

  const hasPending = useCallback(() => inFlightCountRef.current > 0, []);

  return { save, isSaving, lastSavedAt, hasPending };
}
