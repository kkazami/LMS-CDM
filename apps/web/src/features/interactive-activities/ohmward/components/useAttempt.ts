'use client';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { type Attempt, type ResponseState } from '../domain/types';
import { INITIAL_DRAFT, useDraftRecovery, type DraftSnapshot } from './DraftRecovery';

export async function api<T>(path: string, method = 'GET', input?: unknown): Promise<T> {
  const response = await fetch(`/api/ohmward/${path}`, { method, cache: 'no-store', ...(input === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) }) });
  const data = await response.json();
  if (!response.ok) { const error = new Error(data.error ?? 'Request failed. Keep your work open and try again.'); Object.assign(error, { status: response.status }); throw error; }
  return data as T;
}

export function useAttempt(levelId: string, enabled: boolean) {
  const recovery = useDraftRecovery(), entry = useMemo(() => recovery.get(levelId), [recovery, levelId]);
  const subscribe = useCallback((listener: () => void) => { const change = () => { listener(); recovery.notify(); }; entry.listeners.add(change); return () => { entry.listeners.delete(change); }; }, [entry, recovery]);
  const getSnapshot = useCallback(() => entry.snapshot, [entry]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => INITIAL_DRAFT);
  const update = useCallback((patch: Partial<DraftSnapshot>) => { entry.snapshot = { ...entry.snapshot, ...patch }; entry.listeners.forEach(listener => listener()); recovery.notify(); }, [entry, recovery]);
  const edit = useCallback((state: ResponseState) => {
    if (entry.snapshot.busy || entry.snapshot.attempt?.status === 'SUBMITTED') return;
    entry.generation++; update({ state, status: 'Unsaved changes' });
  }, [entry, update]);
  const start = useCallback(async () => {
    if (entry.generation !== entry.saved || entry.snapshot.attempt?.status === 'IN_PROGRESS') return;
    update({ busy: true, error: '' });
    try {
      const attempt = await api<Attempt>(`levels/${levelId}/attempts`, 'POST');
      entry.generation = 0; entry.saved = 0; entry.blocked = false;
      update({ attempt, state: attempt.state, status: 'Saved', xp: 0 });
    } catch (failure) { update({ error: failure instanceof Error ? failure.message : 'Could not open the challenge.' }); }
    finally { update({ busy: false }); }
  }, [entry, levelId, update]);
  const flush = useCallback(() => {
    entry.queue = entry.queue.catch(() => false).then(async () => {
      const row = entry.snapshot.attempt;
      if (!row || row.status !== 'IN_PROGRESS' || entry.blocked) return false;
      if (entry.generation === entry.saved) return true;
      const state = entry.snapshot.state, serial = entry.generation; update({ status: 'Saving…' });
      try {
        const attempt = await api<Attempt>(`attempts/${row.id}`, 'PATCH', { revision: row.revision, state });
        entry.saved = serial;
        update({ attempt: { ...attempt, hintIds: entry.snapshot.attempt?.hintIds ?? attempt.hintIds, revealedHints: entry.snapshot.attempt?.revealedHints ?? attempt.revealedHints }, status: entry.generation === serial ? 'Saved' : 'Unsaved changes', error: '' });
        return true;
      } catch (failure) {
        const code = (failure as {status?: number}).status; if (code === 409) entry.blocked = true;
        update({ status: code === 409 ? 'Save conflict' : 'Not saved', error: failure instanceof Error ? failure.message : 'Save failed. Your draft stays in this tab.' }); return false;
      }
    });
    return entry.queue;
  }, [entry, update]);
  useEffect(() => {
    if (!enabled || entry.generation === entry.saved || entry.snapshot.attempt?.status !== 'IN_PROGRESS') return;
    const timer = setTimeout(() => { void flush(); }, 800); return () => clearTimeout(timer);
  }, [snapshot.state, enabled, entry, flush]);
  useEffect(() => () => { if (enabled && entry.generation !== entry.saved) void flush(); }, [enabled, entry, flush]);
  async function submit() {
    if (!entry.snapshot.attempt || entry.snapshot.busy) return; update({ busy: true, error: '' });
    try {
      if (!await flush()) return;
      const row = entry.snapshot.attempt;
      const result = await api<{attempt: Attempt; xpGranted: number}>(`attempts/${row.id}/submit`, 'POST', { revision: row.revision, state: entry.snapshot.state });
      entry.saved = entry.generation; update({ attempt: result.attempt, xp: result.xpGranted, status: 'Submitted' });
    } catch (failure) { update({ error: failure instanceof Error ? failure.message : 'Submission failed. Your work is still here.' }); }
    finally { update({ busy: false }); }
  }
  async function hint() {
    const row = entry.snapshot.attempt; if (!row || entry.snapshot.busy) return; update({ busy: true, error: '' });
    try { const response = await api<Attempt>(`attempts/${row.id}/hints`, 'POST', { index: row.hintIds.length }); update({ attempt: { ...entry.snapshot.attempt!, hintIds: response.hintIds, revealedHints: response.revealedHints } }); }
    catch (failure) { update({ error: failure instanceof Error ? failure.message : 'Could not reveal this hint.' }); }
    finally { update({ busy: false }); }
  }
  async function reloadSaved() {
    const current = entry.snapshot.attempt;
    if (!current || entry.snapshot.busy || !window.confirm('Replace this page’s unsaved work with the latest saved version?')) return;
    update({ busy: true }); const serial = entry.generation;
    try {
      await entry.queue; const row = await api<Attempt>(`attempts/${current.id}`);
      if (serial !== entry.generation) { update({ error: 'Your answer changed while reloading. The newer edits were kept.' }); return; }
      entry.saved = ++entry.generation; entry.blocked = false; update({ attempt: row, state: row.state, status: 'Saved', error: '' });
    } catch (failure) { update({ error: failure instanceof Error ? failure.message : 'Could not reload.' }); }
    finally { update({ busy: false }); }
  }
  return { ...snapshot, edit, start, submit, hint, flush, reloadSaved };
}
