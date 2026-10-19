import { academicPageActor } from '@/lib/academic-structure/page-policy';
import { notFound } from 'next/navigation';
import { organizationPrograms } from '@/lib/academic-structure/programs';
import OrganizationChart from '@/components/academic-structure/OrganizationChart';
import AcademicSetupUnavailable from '@/components/academic-structure/AcademicSetupUnavailable';
import { isAcademicSchemaUnavailable } from '@/lib/academic-structure/schema-readiness';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: {
    params: Promise<{
        institute: string;
    }>;
}) {
    const p = await params;
    if (p.institute !== 'ics') notFound();
    const actor = await academicPageActor(p.institute, true);
    if (actor.role !== 'INSTRUCTOR' || actor.instituteCode !== p.institute.toLowerCase())
        notFound();
    let programs;
    try { programs = await organizationPrograms(actor); }
    catch (error) {
        if (isAcademicSchemaUnavailable(error)) return <AcademicSetupUnavailable feature="Organizational Chart" message="The Program Head and organizational chart database setup is not installed yet. The existing Calendar does not need this setup."/>;
        throw error;
    }
    return <OrganizationChart instituteCode={actor.instituteCode} programs={programs}/>;
}
