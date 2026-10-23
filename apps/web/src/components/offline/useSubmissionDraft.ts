"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSubmissionDraft,
  saveSubmissionDraft,
  deleteSubmissionDraft,
  isIndexedDbSupported,
} from "@/lib/ite/offline/idb";
import { formatManilaTime } from "@/lib/ite/offline/pure-logic";
import type { SubmissionDraftLink } from "@/lib/ite/offline/types";

interface UseSubmissionDraftOptions {
  itemId: string;
  courseId: string;
  userId?: string;
  isIteStudent: boolean;
  isSubmitted: boolean;
}

export function useSubmissionDraft({
  itemId,
  courseId,
  userId,
  isIteStudent,
  isSubmitted,
}: UseSubmissionDraftOptions) {
  const [draftText, setDraftText] = useState("");
  const [draftLinks, setDraftLinks] = useState<SubmissionDraftLink[]>([]);
  const [lastSavedManila, setLastSavedManila] = useState<string | null>(null);
  const [hasUnsentDraft, setHasUnsentDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const initialLoadDoneRef = useRef(false);

  // 1. Load draft on mount
  useEffect(() => {
    if (!isIteStudent || !userId || isSubmitted || !isIndexedDbSupported()) {
      return;
    }

    getSubmissionDraft(userId, itemId).then((draft) => {
      if (draft) {
        setDraftText(draft.text || "");
        setDraftLinks(draft.links || []);
        setLastSavedManila(draft.manilaUpdatedAt || formatManilaTime(draft.updatedAt));
        const hasContent = Boolean((draft.text && draft.text.trim().length > 0) || (draft.links && draft.links.length > 0));
        setHasUnsentDraft(hasContent);
      }
      initialLoadDoneRef.current = true;
    });
  }, [itemId, userId, isIteStudent, isSubmitted]);

  // 2. Save function
  const saveDraft = useCallback(
    async (text: string, links: SubmissionDraftLink[]) => {
      if (!isIteStudent || !userId || isSubmitted || !initialLoadDoneRef.current || !isIndexedDbSupported()) {
        return;
      }

      const hasContent = Boolean(text.trim().length > 0 || links.length > 0);
      if (!hasContent) {
        // If empty, delete draft
        await deleteSubmissionDraft(userId, itemId);
        setHasUnsentDraft(false);
        setLastSavedManila(null);
        return;
      }

      setIsSaving(true);
      const now = Date.now();
      const manilaTime = formatManilaTime(now);

      await saveSubmissionDraft(userId, {
        itemId,
        courseId,
        userId,
        text,
        links,
        updatedAt: now,
        manilaUpdatedAt: manilaTime,
      });

      setLastSavedManila(manilaTime);
      setHasUnsentDraft(true);
      setIsSaving(false);
    },
    [itemId, courseId, userId, isIteStudent, isSubmitted]
  );

  // 3. Clear draft upon successful submission
  const clearDraft = useCallback(async () => {
    if (!userId || !isIndexedDbSupported()) return;
    await deleteSubmissionDraft(userId, itemId);
    setHasUnsentDraft(false);
    setLastSavedManila(null);
    setDraftText("");
    setDraftLinks([]);
  }, [userId, itemId]);

  return {
    draftText,
    setDraftText,
    draftLinks,
    setDraftLinks,
    lastSavedManila,
    hasUnsentDraft,
    isSaving,
    saveDraft,
    clearDraft,
  };
}
