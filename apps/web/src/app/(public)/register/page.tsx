import Link from "next/link";
export default function RegisterPage() {
  return <main className="min-h-screen grid place-items-center bg-slate-50 p-6 dark:bg-[#0B0D13]">
    <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 dark:border-white/10 dark:bg-[#141721] dark:text-slate-100">
      <h1 className="mt-3 text-2xl font-bold">Request LMS Access</h1>
      <p className="mt-5 leading-relaxed">CdM LMS accounts are created by authorized school personnel after enrollment verification. To request an account or correct your registration details, please contact or visit the Office of the Registrar.</p>
      <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">If you have already received an account invitation, use the activation link sent to your registered email address.</p>
      <div className="mt-7 flex flex-wrap gap-4">
        <Link className="min-h-11 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900" href="/login">Back to Sign In</Link>
        <Link className="py-3 text-sm font-semibold underline underline-offset-4" href="/activate">Request a New Activation Link</Link>
      </div>
    </section>
  </main>;
}
