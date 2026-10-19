'use client';
import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';

type Instructor = { id: string; name: string };
export default function AddProgramInstructor({ program, version, onAdded, onClose }: {
    program: { id: string; code: string }; version: number;
    onAdded: (name: string) => Promise<void>; onClose: () => void;
}) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [query, setQuery] = useState(''), [instructors, setInstructors] = useState<Instructor[]>([]);
    const [selected, setSelected] = useState<Instructor | null>(null), [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
    const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-orange-600 dark:border-white/20 dark:bg-slate-900 dark:text-white';
    useEffect(() => { dialog.current?.showModal(); }, []);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError('');
        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const response = await fetch(`/api/programs/${encodeURIComponent(program.id)}/instructors?q=${encodeURIComponent(query)}`, { cache: 'no-store', signal: controller.signal });
                    const data = await response.json();
                    if (!response.ok) throw Error(data.message ?? 'Could not load instructors.');
                    if (!controller.signal.aborted) { setInstructors(data.instructors); setHasMore(data.hasMore); }
                } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Could not load instructors.'); }
                finally { if (!controller.signal.aborted) setLoading(false); }
            })();
        }, 200);
        return () => { controller.abort(); clearTimeout(timer); };
    }, [program.id, query, attempt]);
    async function save(event: React.FormEvent) {
        event.preventDefault();
        if (!selected || busy) return;
        setBusy(true); setError('');
        try {
            const response = await fetch(`/api/programs/${encodeURIComponent(program.id)}/instructors`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instructorId: selected.id, version }) });
            const data = await response.json();
            if (!response.ok) throw Error(data.message ?? 'Could not add this instructor.');
            await onAdded(selected.name);
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not add this instructor.'); setBusy(false); }
    }
    return <dialog ref={dialog} aria-labelledby="add-program-instructor-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} onClose={onClose}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:bg-[#141721] dark:text-slate-100 sm:p-6">
        <header className="flex items-start justify-between gap-3"><div><h2 id="add-program-instructor-title" className="text-xl font-bold">Add instructor to {program.code}</h2><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Choose an existing ICS instructor. They will appear in this program’s People &amp; classes chart.</p></div><button type="button" disabled={busy} aria-label="Close add instructor" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-100 focus-visible:outline-2 disabled:opacity-50 dark:hover:bg-white/10"><X size={20} aria-hidden /></button></header>
        <form onSubmit={event => void save(event)} className="mt-5 space-y-4">
            <label className="block text-sm font-semibold" htmlFor="program-instructor-search">Search instructors</label>
            <div className="relative"><Search size={17} aria-hidden className="pointer-events-none absolute left-3 top-3 text-slate-500"/><input id="program-instructor-search" autoFocus maxLength={100} value={query} onChange={event => { setQuery(event.target.value); setSelected(null); }} disabled={busy} placeholder="Instructor name" className={`${field} pl-10`} /></div>
            <fieldset disabled={busy || loading} className="space-y-2"><legend className="mb-2 text-sm font-semibold">Available instructors</legend>
                {loading ? <p role="status" className="py-4 text-sm text-slate-500">Loading instructors…</p> : <div className="max-h-64 space-y-1 overflow-y-auto">{instructors.map(instructor => <label key={instructor.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-orange-50 focus-within:outline-2 focus-within:outline-orange-600 dark:border-white/15 dark:hover:bg-orange-950/40"><input type="radio" name="instructorId" value={instructor.id} checked={selected?.id === instructor.id} onChange={() => setSelected(instructor)} className="accent-orange-700"/><span className="break-words">{instructor.name}</span></label>)}{!instructors.length && !error && <p className="py-4 text-sm text-slate-500">{query ? 'No matching instructors. Try another name.' : 'No more eligible instructors. Current program members are already on the chart.'}</p>}</div>}
            </fieldset>
            {hasMore && !loading && <p className="text-xs text-slate-500">Showing the first 50 matches. Search by name to narrow the list.</p>}
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">Adds program membership only. Their role, class programs, teaching assignments and enrollments stay the same.</p>
            {error && <div role="alert" className="text-sm text-red-700 dark:text-red-300">{error} <button type="button" disabled={busy} onClick={() => setAttempt(value => value + 1)} className="underline">Reload instructors</button></div>}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4 dark:border-white/10"><button type="button" disabled={busy} onClick={onClose} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5">Cancel</button><button type="submit" disabled={!selected || loading || busy} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50"><UserPlus size={17} aria-hidden/>{busy ? 'Adding…' : 'Add instructor'}</button></div>
        </form>
    </dialog>;
}
