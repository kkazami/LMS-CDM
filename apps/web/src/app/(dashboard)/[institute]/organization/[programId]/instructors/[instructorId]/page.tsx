import ProgramBackLink from '@/components/academic-structure/ProgramBackLink';
import { academicPageActor } from '@/lib/academic-structure/page-policy';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { programInstructorClasses } from '@/lib/academic-structure/programs';
import { AccessError } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        institute: string;
        programId: string;
        instructorId: string;
    }>;
}) {
    const p = await params;
    if (p.institute !== 'ics') notFound();
    const actor = await academicPageActor(p.institute, false);
    if (actor.instituteCode !== p.institute.toLowerCase())
        notFound();
    let data;
    try {
        data = await programInstructorClasses(actor, p.programId, p.instructorId);
    }
    catch (e) {
        if (e instanceof AccessError)
            notFound();
        throw e;
    }
    return <section className="space-y-5"><ProgramBackLink href={`/${p.institute}/organization`}>Back to Program Chart</ProgramBackLink><h1 className="text-2xl font-bold">{data.instructor.name} · program classes</h1><p className="text-sm text-slate-500">Read-only oversight · only active classes in your authorized program.</p><ul className="grid gap-4 md:grid-cols-2">{data.courses.map(c => <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#141721]"><h2 className="font-bold">{c.title}</h2><p className="my-3 break-words text-sm text-slate-500">{c.description}</p><Link className="inline-block rounded-lg border px-3 py-2 text-sm font-semibold" href={`/${p.institute}/organization/${p.programId}/courses/${c.id}`}>Open read-only class</Link></li>)}</ul>{!data.courses.length && <p>No active mapped classes in this program.</p>}</section>;
}
