'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Network, Plus, Search, LockKeyhole } from 'lucide-react';
import FacultyChart from './FacultyChart';
import AddProgramInstructor from './AddProgramInstructor';
import type { readChart } from '@/lib/academic-structure/programs';
type Chart = Awaited<ReturnType<typeof readChart>>;
type Program = {
    id: string;
    name: string;
    code: string;
    isHead: boolean;
};
const field = 'w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-orange-500 dark:border-white/20 dark:bg-slate-900 dark:text-white';
const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10';
export default function OrganizationChart({ instituteCode, programs }: {
    instituteCode: string;
    programs: Program[];
}) {
    const [programId, setProgramId] = useState(programs[0]?.id ?? ''), [chart, setChart] = useState<Chart | null>(null), [query, setQuery] = useState(''), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [edit, setEdit] = useState<string | null>(null), [parent, setParent] = useState(''), [label, setLabel] = useState(''), [kind, setKind] = useState<'GROUP' | 'INSTRUCTOR'>('GROUP'), [member, setMember] = useState(''), [position, setPosition] = useState(0), [confirm, setConfirm] = useState(false);
    const [addingInstructor, setAddingInstructor] = useState(false);
    const loadSequence = useRef(0);
    const load = useCallback(async (signal?: AbortSignal) => {
        if (!programId)
            return;
        const sequence = ++loadSequence.current;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`/api/programs/${encodeURIComponent(programId)}/chart`, { cache: 'no-store', signal });
            const body = await response.json();
            if (!response.ok)
                throw Error(body.message ?? 'Chart unavailable.');
            if (!signal?.aborted && sequence === loadSequence.current)
                setChart(body);
        }
        catch (e) {
            if (!signal?.aborted && sequence === loadSequence.current) {
                setChart(null);
                setError(e instanceof Error ? e.message : 'Chart unavailable.');
            }
        }
        finally {
            if (!signal?.aborted && sequence === loadSequence.current)
                setLoading(false);
        }
    }, [programId]);
    useEffect(() => { const c = new AbortController(); setChart(null); setEdit(null); setAddingInstructor(false); setCollapsed(new Set()); void load(c.signal); return () => c.abort(); }, [load]);
    useEffect(() => { const refresh = () => { if (document.visibilityState === 'visible') void load(); }; window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); }; }, [load]);
    function begin(id: string | null) {
        if (!chart)
            return;
        const n = chart.nodes.find(n => n.id === id);
        setEdit(id ?? 'NEW');
        setParent(n?.parentId ?? chart.nodes.find(n => n.kind === 'ROOT')?.id ?? '');
        setLabel(n?.label ?? '');
        setKind(n?.kind === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'GROUP');
        setMember(n?.memberUserId ?? '');
        setPosition(n?.position ?? 0);
        setConfirm(false);
        setError('');
    }
    async function save(operation: 'CREATE' | 'UPDATE' | 'DELETE') {
        if (!chart)
            return;
        setBusy(true);
        setError('');
        try {
            const body = operation === 'DELETE' ? { operation, id: edit, version: chart.version, confirm: true } : operation === 'CREATE' ? { operation, version: chart.version, parentId: parent, label, kind, memberUserId: kind === 'INSTRUCTOR' ? member : null, position } : { operation, id: edit, version: chart.version, parentId: parent, label, position };
            const response = await fetch(`/api/programs/${encodeURIComponent(programId)}/chart`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            const data = await response.json();
            if (!response.ok)
                throw Error(data.message ?? 'Save could not be confirmed.');
            setEdit(null);
            setNotice('Chart saved. Academic records and assignments are unchanged.');
            await load();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Save could not be confirmed. Refresh before retrying.');
        }
        finally {
            setBusy(false);
        }
    }
    const visibleNodes = new Set<string>();
    if (chart && query) {
        for (const node of chart.nodes) {
            const person = chart.members.find(m => m.id === node.memberUserId);
            if ((node.label + ' ' + (person?.name ?? '')).toLowerCase().includes(query.toLowerCase())) {
                let current: typeof node | undefined = node;
                while (current && !visibleNodes.has(current.id)) {
                    visibleNodes.add(current.id);
                    const parentId: string | null = current.parentId;
                    current = chart.nodes.find(n => n.id === parentId);
                }
            }
        }
    }
    function render(parentId: string | null, depth = 0): React.ReactNode {
        if (!chart || depth > 12)
            return null;
        return <ul className={depth && depth <= 3 ? 'ml-2 space-y-2 border-l border-slate-200 pl-2 dark:border-white/10 sm:ml-3 sm:pl-3' : 'space-y-3'}>{chart.nodes.filter(n => n.parentId === parentId && (!query || visibleNodes.has(n.id))).map(n => { const person = chart.members.find(m => m.id === n.memberUserId); const childCount = chart.nodes.filter(c => c.parentId === n.id).length; const matches = !query || `${n.label} ${person?.name ?? ''}`.toLowerCase().includes(query.toLowerCase()); return <li key={n.id}><div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${'border-slate-200 bg-white dark:border-white/10 dark:bg-[#141721]'}`}><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{childCount > 0 && <button className={button} aria-expanded={!collapsed.has(n.id)} aria-label={`${collapsed.has(n.id) ? 'Expand' : 'Collapse'} ${n.label}`} onClick={() => setCollapsed(current => { const next = new Set(current); next.has(n.id) ? next.delete(n.id) : next.add(n.id); return next; })}>{collapsed.has(n.id) ? '+' : '−'}</button>}<span className="break-words font-semibold">{person?.name ?? n.label}</span>{person?.isHead && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">Program Head</span>}</div><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{n.kind === 'ROOT' ? 'Program' : n.kind === 'GROUP' ? 'Academic group' : n.label}</p></div><div className="flex flex-wrap gap-2">{person && chart.isHead && <Link className={button} href={`/${instituteCode}/organization/${programId}/instructors/${person.id}`}>Browse instructor classes</Link>}{chart.isHead && n.kind !== 'ROOT' && <button className={button} onClick={() => begin(n.id)}>Edit placement</button>}</div></div>{!collapsed.has(n.id) && childCount > 0 && <div className="mt-2">{render(n.id, depth + 1)}</div>}</li>; })}</ul>;
    }
    return <section className="min-w-0 space-y-5 text-slate-900 dark:text-slate-100"><header className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 max-w-full"><h1 className="mt-1 break-words text-2xl font-bold [overflow-wrap:anywhere]"><Network aria-hidden className="mr-2 inline-block align-middle" size={25}/>Organizational Chart</h1><p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">ICS · Program Heads, faculty and their program classes. Custom placements never change academic authority.</p></div>{chart?.isHead ? <span className="rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">Program Head · {chart.program.code}</span> : <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs dark:bg-white/10"><LockKeyhole size={14}/>Read-only instructor view</span>}</header>
  {!programs.length ? <div className="rounded-2xl border border-dashed border-slate-300 p-8"><h2 className="font-semibold">No program assignment</h2><p className="mt-2 text-sm text-slate-500">Your existing class access is unchanged. An authorized assignment is needed before a program chart is available.</p></div> : <>
  <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#141721]"><label className="min-w-0 basis-44 flex-1 text-sm font-semibold">Program<select className={field} disabled={busy} value={programId} onChange={e => setProgramId(e.target.value)}>{programs.map(p => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></label><label className="min-w-0 basis-44 flex-1 text-sm font-semibold">Search instructors or groups<div className="relative"><input className={`${field} pr-9`} value={query} onChange={e => { setQuery(e.target.value); setCollapsed(new Set()); }} placeholder="Name or designation"/><Search size={17} className="pointer-events-none absolute right-3 top-3"/></div></label><button className={button} onClick={() => setCollapsed(new Set())}>Expand all</button>{chart?.isHead && <button className={button} onClick={() => begin(null)}><Plus size={16}/>Add placement</button>}</div>
  <p role="status" className="text-sm">{loading ? 'Loading program chart…' : notice}</p>{error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error} <button className="underline" onClick={() => void load()}>Refresh</button></div>}
  {chart && <FacultyChart key={`faculty:${chart.program.id}`} chart={chart} instituteCode={instituteCode} onAddInstructor={() => setAddingInstructor(true)}/> }
  {addingInstructor && chart?.isHead && <AddProgramInstructor key={`add-instructor:${chart.program.id}`} program={chart.program} version={chart.version} onClose={() => setAddingInstructor(false)} onAdded={async name => { setAddingInstructor(false); setNotice(`${name} added to ${chart.program.code}.`); await load(); }}/>}
  {chart && <h2 className="text-lg font-bold">Custom organizational chart</h2>}
  {chart && <div className="min-w-0"><section className="min-w-0" aria-label="Program hierarchy">{query && !visibleNodes.size && <p role="status">No matching instructors or groups.</p>}{render(null)}{!chart.nodes.length && <p className="rounded-xl border border-dashed p-6 text-sm">The authorized program setup has not created a root yet.</p>}</section></div>}
  {edit && chart?.isHead && <form onSubmit={e => { e.preventDefault(); void save(edit === 'NEW' ? 'CREATE' : 'UPDATE'); }} className="space-y-4 rounded-2xl border border-slate-300 bg-white p-5 dark:border-white/20 dark:bg-[#141721]" aria-label="Edit chart placement"><h2 className="font-bold">{edit === 'NEW' ? 'Add chart placement' : 'Edit chart placement'}</h2><div className="grid gap-3 sm:grid-cols-2">{edit === 'NEW' && <label className="text-sm font-semibold">Type<select className={field} value={kind} onChange={e => setKind(e.target.value as typeof kind)}><option value="GROUP">Academic group</option><option value="INSTRUCTOR">Instructor</option></select></label>}<label className="text-sm font-semibold">Parent<select required className={field} value={parent} onChange={e => setParent(e.target.value)}>{chart.nodes.filter(n => n.id !== edit).map(n => <option key={n.id} value={n.id}>{n.label}</option>)}</select></label>{edit === 'NEW' && kind === 'INSTRUCTOR' && <label className="text-sm font-semibold">Assigned instructor<select required className={field} value={member} onChange={e => setMember(e.target.value)}><option value="">Choose instructor</option>{chart.members.filter(m => !chart.nodes.some(n => n.memberUserId === m.id)).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}<label className="text-sm font-semibold">{kind === 'INSTRUCTOR' ? 'Public academic designation' : 'Group name'}<input required autoFocus maxLength={120} className={field} value={label} onChange={e => setLabel(e.target.value)}/></label><label className="text-sm font-semibold">Display order<input required type="number" min={0} max={10000} className={field} value={position} onChange={e => setPosition(Number(e.target.value))}/></label></div><p className="text-xs text-slate-500">Structural placement only. Moving or deleting a group cannot change academic authority. Deleting a group reparents its children.</p><div className="flex flex-wrap gap-2"><button className={button} disabled={busy} type="submit">{busy ? 'Saving…' : 'Save placement'}</button><button className={button} disabled={busy} type="button" onClick={() => setEdit(null)}>Discard</button>{edit !== 'NEW' && <button className={button} disabled={busy} type="button" onClick={() => setConfirm(true)}>Delete placement…</button>}</div>{confirm && <div role="alert" className="text-sm"><p>Remove this placement and reparent any children? No user or class will be deleted.</p><button className={`${button} mt-2 text-red-700`} disabled={busy} type="button" onClick={() => void save('DELETE')}>Confirm placement deletion</button></div>}</form>}
  </>}
 </section>;
}
