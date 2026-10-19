import SuperUserOverview from '@/components/super-user-v1/SuperUserOverview';

export default async function AcademicOperations({ params }: { params: Promise<{ institute: string }> }) {
  const { institute } = await params;
  return <SuperUserOverview institute={institute} />;
}
