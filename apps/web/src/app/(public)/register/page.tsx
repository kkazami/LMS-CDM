import RegisterForm from '@/components/forms/RegisterForm';
import styles from '@/components/forms/StudentAccess.module.css';
import { googleEnabled, readGoogleProfile } from '@/lib/google-auth';
import { db } from '@/lib/db';
import { supportedInstitute } from '@/lib/super-user-v1/capabilities';

export const dynamic = 'force-dynamic';
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ institute?: string; google?: string }> }) {
  const query = await searchParams;
  const profile = query.google === '1' ? await readGoogleProfile() : null;
  const existing = profile ? await db.user.findFirst({ where: { email: { equals: profile.email, mode: 'insensitive' }, role: 'STUDENT' }, include: { institute: true } }) : null;
  return <main className={styles.page}><section className={styles.panel}>
    {query.google === '1' && !profile && <p role="alert" className={styles.error}>Google sign-in expired. Continue with Google again.</p>}
    <RegisterForm instituteCode={existing?.institute.code || profile?.instituteCode || supportedInstitute(query.institute) || 'ics'} googleEnabled={googleEnabled()} googleProfile={profile ? { email: profile.email, name: existing?.name || profile.name } : null} linking={Boolean(existing)} studentNumber={existing?.studentNumber || existing?.uniqueId || ''} />
  </section></main>;
}
