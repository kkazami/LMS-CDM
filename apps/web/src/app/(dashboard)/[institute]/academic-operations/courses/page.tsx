import InstituteCourseList from '@/components/super-user-v1/InstituteCourseList';
export default async function Courses({ params, searchParams }: { params: Promise<{ institute: string }>; searchParams: Promise<{ assignment?: string }> }) {
  const [{ institute }, { assignment }] = await Promise.all([params, searchParams]);
  return <InstituteCourseList institute={institute} initialAssignment={assignment === 'unassigned' ? 'unassigned' : 'all'} />;
}
