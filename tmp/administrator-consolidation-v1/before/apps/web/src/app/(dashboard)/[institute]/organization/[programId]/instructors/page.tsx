import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserRound, ArrowUpRight } from 'lucide-react';
import { academicPageActor } from '@/lib/academic-structure/page-policy';
import { readChart } from '@/lib/academic-structure/programs';
import { AccessError } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ institute: string; programId: string }> }) {
    const { institute, programId } = await params;
    if (institute !== 'ics') notFound();
    const actor = await academicPageActor(institute, true);
    let chart;
    try { chart = await readChart(actor, programId); }
    catch (e) { if (e instanceof AccessError) notFound(); throw e; }
    if (!chart.isHead) notFound();
    return <section className="space-y-6"><Link className="text-sm underline" href="/ics/organization">Back to program chart</Link><header><h1 className="text-2xl font-bold">{chart.program.code} · Program instructors</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Choose an instructor, then open one of their classes. Only active classes assigned to this program are available.</p></header><ul className="divide-y rounded-2xl border border-slate-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#141721]">{chart.members.map(m => <li key={m.id}><Link className="flex items-center gap-4 p-5 hover:bg-slate-50 focus-visible:outline-2 dark:hover:bg-white/5" href={`/ics/organization/${encodeURIComponent(programId)}/instructors/${encodeURIComponent(m.id)}`}><span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-800 dark:bg-orange-950 dark:text-orange-200"><UserRound aria-hidden size={25}/></span><span className="min-w-0 flex-1"><span className="block break-words font-semibold">{m.name}</span><span className="mt-1 block text-sm text-slate-500">{m.isHead ? 'Program Head' : 'Faculty'} · {m.classCount} {m.classCount === 1 ? 'class' : 'classes'}</span></span><ArrowUpRight aria-hidden size={20}/></Link></li>)}</ul>{!chart.members.length && <p>No active instructors are assigned to this program.</p>}</section>;
}
