import type { Metadata } from 'next';
import ActivationForm from '@/components/forms/ActivationForm';
export const metadata: Metadata = { title: 'Activate Account · CdM LMS', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function Page() { return <main className="grid min-h-screen place-items-center bg-slate-50 p-5 dark:bg-[#0B0D13]"><ActivationForm /></main>; }
