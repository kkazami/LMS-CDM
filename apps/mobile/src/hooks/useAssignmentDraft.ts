import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';
import { readStudentDraft, writeStudentDraft, newOperationKey } from '../lib/student-drafts';
import { studentScope, scopeIsCurrent } from '../lib/student-scope';

export type DraftAttachment = { url: string; fileName: string; type: string; mimeType?: string };
type Draft = { attachments: DraftAttachment[]; operationKey?: string; fingerprint?: string; receiptId?: string; receiptStatus?: string };

export function useAssignmentDraft(courseId: string, assignmentId: string | undefined) {
  const scope = useRef(studentScope()).current;
  const verified = useAuthStore(s => s.isSessionVerified);
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const hasLocalDraft = useRef(false);
  const current = useRef<Draft>({ attachments: [] });
  const key = `assignment:${courseId}:${assignmentId}`;
  const hydrated = useRef(false);
  const serverAttachments = useRef<DraftAttachment[]>([]);
  useEffect(() => {
    let active = true;
    hydrated.current = false;
    setReady(false);
    if (!assignmentId || !verified) { setStatus('Reconnect to unlock your saved draft.'); return; }
    readStudentDraft<Draft>(key).then(draft => {
      if (!active) return;
      current.current = draft ?? { attachments: serverAttachments.current };
      hasLocalDraft.current = !!draft;
      setAttachments(current.current.attachments);
      hydrated.current = true;
      setReady(true);
      setStatus(draft?.receiptId ? draft.receiptStatus === 'DRAFT' ? 'Draft saved to server · not submitted' : 'Submitted · server receipt confirmed' : draft ? 'Draft restored on this device' : '');
    }).catch(() => { if (active) setStatus('Device draft storage is unavailable. Free device storage and retry, or continue in the web portal.'); });
    return () => { active = false; };
  }, [key, verified, assignmentId, retry]);

  const update = useCallback(async (value: React.SetStateAction<DraftAttachment[]>) => {
    if (!hydrated.current || !scopeIsCurrent(scope)) return false;
    const next = typeof value === 'function' ? value(current.current.attachments) : value;
    current.current = { attachments: next };
    hasLocalDraft.current = true;
    setAttachments(next);
    setStatus('Saving draft on this device…');
    try { await writeStudentDraft(key, current.current); setStatus('Saved on this device · not submitted'); return true; }
    catch { setStatus('Draft could not save. Keep this screen open and retry.'); return false; }
  }, [key, scope]);
  const restoreServer = useCallback((server: DraftAttachment[]) => {
    serverAttachments.current = server;
    if (hydrated.current && !hasLocalDraft.current && current.current.attachments.length === 0 && !current.current.operationKey) {
      current.current = { attachments: server };
      setAttachments(server);
    }
  }, []);
  const prepareSubmission = async (submissionStatus = 'SUBMITTED') => {
    if (!hydrated.current || !verified || !scopeIsCurrent(scope)) throw new Error('Reconnect and verify your sign-in before submitting.');
    const fingerprint = JSON.stringify([submissionStatus, current.current.attachments]);
    if (current.current.fingerprint !== fingerprint) {
      current.current = { ...current.current, fingerprint, operationKey: newOperationKey(), receiptId: undefined, receiptStatus: undefined };
    }
    await writeStudentDraft(key, current.current);
    if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed. Reopen this assignment.');
    setStatus('Sending · awaiting server confirmation');
    return current.current.operationKey!;
  };
  const confirmReceipt = async (id: string, receiptStatus = 'SUBMITTED') => {
    if (!scopeIsCurrent(scope)) return;
    current.current = { ...current.current, receiptId: id, receiptStatus };
    try { await writeStudentDraft(key, current.current); setStatus(receiptStatus === 'DRAFT' ? 'Draft saved to server · not submitted' : 'Submitted · server receipt confirmed'); }
    catch { setStatus('Submitted · server confirmed. Device receipt could not save.'); }
  };
  return { attachments, setAttachments: update, restoreServer, prepareSubmission, confirmReceipt, draftStatus: status, draftReady: ready && verified, retryDraft: () => setRetry(value => value + 1) };
}
