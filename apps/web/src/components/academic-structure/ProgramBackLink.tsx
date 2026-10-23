import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export default function ProgramBackLink({ href, children }: { href: string; children: ReactNode }) {
    const isIte = href.startsWith('/ite') || href.includes('/ite/');
    return <Link href={href} className={`group inline-flex min-h-11 max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors duration-150 ${
        isIte
            ? 'hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-blue-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-800 dark:hover:bg-blue-950/50 dark:hover:text-blue-200'
            : 'hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800 focus-visible:outline-orange-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/50 dark:hover:text-orange-200'
    } focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none`}>
        <ArrowLeft aria-hidden="true" size={17} className="shrink-0 transition-transform duration-200 ease-out motion-safe:group-hover:-translate-x-0.5 motion-safe:group-focus-visible:-translate-x-0.5 motion-reduce:transition-none" />
        <span>{children}</span>
    </Link>;
}
