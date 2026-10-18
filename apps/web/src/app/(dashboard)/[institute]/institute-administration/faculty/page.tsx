import { redirect, notFound } from 'next/navigation';
import { getSession } from '@/lib/auth-session';
import { administratorInstitute } from '@/lib/administrator-scope';
export default async function Page({ params }: { params: Promise<{ institute: string }> }) {
  const { institute } = await params; const session = await getSession();
  if (!session || session.user.role !== 'ADMIN' || session.user.institute.code.toLowerCase() !== institute.toLowerCase()) notFound();
  await administratorInstitute(session.user, institute);
  redirect(`/${institute}/admin/faculty`);
}
