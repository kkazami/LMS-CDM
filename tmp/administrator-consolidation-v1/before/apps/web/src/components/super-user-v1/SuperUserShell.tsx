import Link from 'next/link';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import { SUPPORTED_INSTITUTES } from '@/lib/super-user-v1/capabilities';

export default function SuperUserShell({ institute, children }: { institute: string; children: React.ReactNode }) {
  const theme = getInstituteTheme(institute);
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b bg-white px-6 py-5" style={{ borderTop: `4px solid ${theme.colors.primary}` }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Academic operations</p><p className="text-xl font-semibold">Super User · {institute.toUpperCase()}</p></div>
        <nav aria-label="Institute scope" className="flex gap-2">{SUPPORTED_INSTITUTES.map(code => <Link key={code} href={`/${code}/academic-operations/courses`} aria-current={code === institute ? 'page' : undefined} className="rounded border px-4 py-2 text-sm font-medium focus-visible:outline-2">{code.toUpperCase()}</Link>)}</nav>
      </div>
      <nav aria-label="Academic operations" className="mx-auto mt-5 flex max-w-6xl gap-6 text-sm font-medium">
        <Link href={`/${institute}/academic-operations/courses`}>Course oversight</Link>
        <Link href={`/${institute}/academic-operations/institute-admins`}>Institute administrators</Link>
      </nav>
    </header>
    <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
  </div>;
}
