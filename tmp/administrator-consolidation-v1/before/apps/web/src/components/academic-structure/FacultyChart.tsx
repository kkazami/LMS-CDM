'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, GraduationCap, UserRound, X, ArrowUpRight } from 'lucide-react';
import type { readChart, programInstructorClasses } from '@/lib/academic-structure/programs';
type Chart = Awaited<ReturnType<typeof readChart>>;
type Member = Chart['members'][number];
type Classes = Awaited<ReturnType<typeof programInstructorClasses>>;
export default function FacultyChart({ chart, instituteCode }: { chart: Chart; instituteCode: string }) {
    const [selected, setSelected] = useState<Member | null>(null), [classes, setClasses] = useState<Classes | null>(null), [error, setError] = useState('');
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => { setSelected(null); }, [chart.program.id]);
    useEffect(() => {
        if (!selected) { dialog.current?.close(); return; }
        dialog.current?.showModal(); setClasses(null); setError('');
        const controller = new AbortController();
        void (async () => {
            try {
                const response = await fetch(`/api/programs/${encodeURIComponent(chart.program.id)}/instructors/${encodeURIComponent(selected.id)}/classes`, { cache: 'no-store', signal: controller.signal });
                const body = await response.json();
                if (!response.ok) throw Error(body.message ?? 'Classes unavailable.');
                if (!controller.signal.aborted) setClasses(body);
            } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Classes unavailable.'); }
        })();
        return () => controller.abort();
    }, [selected, chart.program.id, chart.version]);
    const heads = chart.members.filter(m => m.isHead), faculty = chart.members.filter(m => !m.isHead);
    function person(member: Member) {
        return <button key={member.id} type="button" disabled={!chart.isHead} onClick={() => { setClasses(null); setError(''); setSelected(member); }} aria-label={`View classes for ${member.name}`} className="group flex min-h-44 w-full min-w-0 flex-col items-center justify-center rounded-2xl px-4 py-5 text-center transition-colors hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 disabled:cursor-default disabled:hover:bg-transparent dark:hover:bg-orange-950/30">
            <span className={`mb-3 flex size-16 items-center justify-center rounded-full ${member.isHead ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200'}`}>{member.isHead ? <GraduationCap size={30} aria-hidden /> : <UserRound size={29} aria-hidden />}</span>
            <span className="max-w-full break-words text-sm font-bold text-slate-900 dark:text-slate-100">{member.name}</span>
            <span className="mt-1 text-xs text-slate-600 dark:text-slate-300">{member.isHead ? 'Program Head' : 'Faculty Instructor'}</span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"><BookOpen size={13} aria-hidden />{member.classCount} {member.classCount === 1 ? 'class' : 'classes'} in {chart.program.code}{chart.isHead && <ArrowUpRight className="ml-1" size={13} aria-hidden />}</span>
        </button>;
    }
    return <section aria-label="Main faculty organizational chart" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#141721] sm:p-8">
        <header className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-lg font-bold">{chart.program.code} · People &amp; classes</h2><p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-300">{chart.isHead ? 'Select an instructor to view their classes in this program.' : 'Your program’s current Program Heads and faculty.'}</p></div>{chart.isHead && <Link className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 dark:border-white/20 dark:hover:bg-white/5" href={`/${instituteCode}/organization/${encodeURIComponent(chart.program.id)}/instructors`}>View program classes</Link>}</header>
        <div className="mx-auto mt-7 max-w-5xl"><div className="mx-auto grid max-w-xl grid-cols-1 justify-items-center gap-2 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">{heads.length ? heads.map(person) : <div className="p-6 text-center"><GraduationCap aria-hidden className="mx-auto mb-3 text-slate-400"/><p className="text-sm font-semibold">Program Head not assigned</p><p className="mt-1 text-xs text-slate-500">An ICS administrator can designate an eligible instructor.</p></div>}</div>
            {faculty.length > 0 && <><div aria-hidden className="mx-auto h-7 w-px bg-slate-300 dark:bg-slate-600"/><div className="grid gap-x-4 gap-y-2 border-t border-slate-300 pt-5 dark:border-slate-600" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,10rem),1fr))' }}>{faculty.map(member => <div key={member.id} className="relative min-w-0 before:absolute before:-top-5 before:left-1/2 before:h-5 before:w-px before:bg-slate-300 dark:before:bg-slate-600">{person(member)}</div>)}</div></>}
            {!faculty.length && <p className="mt-6 text-center text-sm text-slate-500">No other active faculty are assigned to this program.</p>}
        </div><p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-white/10">This main chart follows current administrator-managed designations. Custom placements below do not change it.</p>
        <dialog ref={dialog} aria-labelledby="instructor-classes-title" onCancel={() => setSelected(null)} onClose={() => setSelected(null)} className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:bg-[#141721] dark:text-slate-100">
            <header className="flex items-start justify-between gap-4"><div><h2 id="instructor-classes-title" className="text-xl font-bold">{selected?.name}</h2><p className="mt-1 text-sm text-slate-500">{chart.program.code} · Instructor’s classes · read-only</p></div><button autoFocus type="button" onClick={() => setSelected(null)} aria-label="Close instructor classes" className="rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-2 dark:hover:bg-white/10"><X size={22}/></button></header>
            {error ? <p role="alert" className="mt-6 text-sm text-red-700 dark:text-red-300">{error} Close this window and refresh the chart to retry.</p> : !classes ? <p role="status" className="py-8 text-sm text-slate-500">Loading instructor classes…</p> : <ul className="mt-6 divide-y divide-slate-200 dark:divide-white/10">{classes.courses.map(c => <li key={c.id} className="py-4"><Link onClick={() => setSelected(null)} href={`/${instituteCode}/organization/${encodeURIComponent(chart.program.id)}/courses/${encodeURIComponent(c.id)}`} className="flex items-center justify-between gap-4 rounded-lg py-2 focus-visible:outline-2"><span className="font-semibold">{c.title}</span><ArrowUpRight size={20} className="shrink-0" aria-hidden /></Link></li>)}{!classes.courses.length && <li className="py-8 text-sm text-slate-500">No active classes are mapped to this instructor in {chart.program.code}.</li>}</ul>}
        </dialog>
    </section>;
}
