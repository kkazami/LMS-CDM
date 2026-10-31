'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { EMPTY_STATE, type Attempt, type ResponseState, type GraphKind } from '../domain/types';

export type DraftSnapshot = { attempt: Attempt | null; state: ResponseState; status: string; error: string; busy: boolean; xp: number };
export type DraftEntry = { snapshot: DraftSnapshot; generation: number; saved: number; blocked: boolean; queue: Promise<boolean>; listeners: Set<() => void>; sandbox?: {revision:number;capabilities:{parts:GraphKind[];sensors:boolean};loaded:boolean} };
export const INITIAL_DRAFT: DraftSnapshot = { attempt: null, state: EMPTY_STATE, status: 'Not started', error: '', busy: false, xp: 0 };
// Written only in the browser. Survives a same-tab SPA login redirect, never disk storage.
const browserOwners = new Map<string, Map<string, DraftEntry>>();
let unloadInstalled = false;
function ownerEntries(ownerId: string): Map<string, DraftEntry> {
  if (typeof window === 'undefined') return new Map();
  if (!unloadInstalled) {
    window.addEventListener('beforeunload', event => {
      if ([...browserOwners.values()].some(entries => [...entries.values()].some(entry => entry.generation !== entry.saved))) { event.preventDefault(); event.returnValue = ''; }
    });
    unloadInstalled = true;
  }
  if (!browserOwners.has(ownerId)) browserOwners.set(ownerId, new Map());
  return browserOwners.get(ownerId)!;
}
const Context = createContext<{ get: (level: string) => DraftEntry; notify: () => void } | null>(null);

/** Memory belongs to the authenticated dashboard, so SPA navigation cannot discard a draft. */
export function DraftRecoveryProvider({ children, ownerId }: { children: ReactNode; ownerId: string }) {
  const entries = useMemo(() => ownerEntries(ownerId), [ownerId]), [notices, setNotices] = useState<string[]>([]);
  const get = useCallback((level: string) => {
    if (!entries.has(level)) entries.set(level, { snapshot: INITIAL_DRAFT, generation: 0, saved: 0, blocked: false, queue: Promise.resolve(true), listeners: new Set() });
    return entries.get(level)!;
  }, [entries]);
  const notify = useCallback(() => { setNotices([...entries].filter(([,entry]) => entry.generation !== entry.saved).map(([level]) => level)); }, [entries]);
  const value = useMemo(() => ({ get, notify }), [get, notify]);
  useEffect(notify, [notify]);
  return <Context.Provider value={value}>{notices.length > 0 && <div role="status" className="mb-5 rounded-xl border border-orange-700/60 bg-orange-50 p-4 text-sm text-slate-900 dark:bg-[#24202a] dark:text-slate-100"><strong>Ohmward has unsaved work.</strong> Your draft stays in this tab while you navigate. {notices.map(level => <Link key={level} className="ml-3 inline-block py-2 underline underline-offset-4" href={level === '_sandbox' ? '/ics/activities/ohmward/sandbox' : `/ics/activities/ohmward/levels/${level}`}>Return to {level === '_sandbox' ? 'sandbox' : level}</Link>)}</div>}{children}</Context.Provider>;
}
export function useDraftRecovery() { const context = useContext(Context); if (!context) throw Error('Ohmward requires its authenticated draft provider.'); return context; }
