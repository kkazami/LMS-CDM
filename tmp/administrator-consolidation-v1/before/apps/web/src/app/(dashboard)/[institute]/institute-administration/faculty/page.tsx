import { notFound } from 'next/navigation';
import FacultyManagement from '@/components/academic-structure/FacultyManagement';
export default async function Page({ params }: { params: Promise<{ institute: string }> }) {
    if ((await params).institute !== 'ics') notFound();
    return <FacultyManagement/>;
}
