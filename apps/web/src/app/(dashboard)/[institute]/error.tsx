'use client';
import { useParams } from 'next/navigation';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const institute = (params?.institute as string) || '';
  const isIte = institute.toLowerCase() === 'ite';

  return <section role="alert" className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-[#141721]">
    <h2 className="text-xl font-semibold">This page could not load</h2>
    <p className="my-4 text-sm text-slate-600 dark:text-slate-300">Your saved work is still available. Try loading this page again.</p>
    <button onClick={reset} className={`min-h-11 rounded-xl px-5 py-2 text-white ${isIte ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>Try again</button>
  </section>;
}
