import { getSession } from '@/lib/auth-session';
import { notFound } from 'next/navigation';
import { canonicalRole, supportedInstitute } from '@/lib/super-user-v1/capabilities';
export default async function InstituteAdministration({ children, params }: { children: React.ReactNode; params: Promise<{ institute: string }> }) {
 const session = await getSession(); const { institute } = await params;
 if (!session || canonicalRole(session.user.role) !== 'ADMIN' || !supportedInstitute(institute) || session.user.institute.code.toLowerCase() !== institute.toLowerCase()) notFound();
 return children;
}
