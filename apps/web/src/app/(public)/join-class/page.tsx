import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-session';
import { needsClassEnrollment } from '@/lib/student-access';
import JoinClassForm from '@/components/forms/JoinClassForm';
import styles from '@/components/forms/StudentAccess.module.css';

export const dynamic = 'force-dynamic';
export default async function JoinClassPage() {
  const session = await getSession(undefined, { allowUnenrolled: true });
  if (!session) redirect('/login');
  if (!await needsClassEnrollment(session.user)) redirect(`/${session.user.institute.code}`);
  return <main className={styles.page}><section className={styles.panel}>
    <h1>Join your first class</h1>
    <p>Welcome, {session.user.name}. Your account belongs to {session.user.institute.code.toUpperCase()}. Enter a class code from this institute to access your classes and institute features.</p>
    <JoinClassForm />
  </section></main>;
}
