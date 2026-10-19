import ProgramClassroom from '@/components/academic-structure/ProgramClassroom';
import { academicPageActor } from '@/lib/academic-structure/page-policy';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readOversight } from '@/lib/academic-structure/programs';
import { AccessError } from '@/lib/super-user-v1/actor';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        institute: string;
        programId: string;
        courseId: string;
    }>;
}) {
    const p = await params;
    if (p.institute !== 'ics') notFound();
    const actor = await academicPageActor(p.institute, false);
    if (actor.instituteCode !== p.institute.toLowerCase())
        notFound();
    let data;
    try {
        data = await readOversight(actor, p.programId, p.courseId);
    }
    catch (e) {
        if (e instanceof AccessError)
            notFound();
        throw e;
    }
    return <ProgramClassroom data={data} programId={p.programId}/>;
}
