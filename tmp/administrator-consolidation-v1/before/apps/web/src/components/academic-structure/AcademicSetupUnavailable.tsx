import { academicSetupMessage } from '@/lib/academic-structure/schema-readiness';

export default function AcademicSetupUnavailable({ feature, message = academicSetupMessage }: { feature: string; message?: string }) {
    return <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900" role="status">
        <h1 className="text-xl font-semibold">{feature} temporarily unavailable</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{message}</p>
    </section>;
}
