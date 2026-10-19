import Link from 'next/link';

export default function InstituteAdminShell({ institute, children }: { institute: string; children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50 text-slate-900"><header className="border-b bg-white px-6 py-6">
    <div className="mx-auto max-w-6xl"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Administration</p><p className="mt-1 text-xl font-semibold">{institute.toUpperCase()}</p>
      <nav aria-label="Administration" className="mt-5 flex flex-wrap gap-6 text-sm font-medium"><Link href={`/${institute}/institute-administration/accounts`}>Accounts</Link><Link href={`/${institute}/institute-administration/courses`}>Courses</Link>{institute === 'ics' && <Link href="/ics/institute-administration/faculty">Faculty &amp; Program Heads</Link>}</nav>
    </div></header><main className="mx-auto max-w-6xl px-6 py-10">{children}</main></div>;
}
