import type { Metadata } from "next";
import Link from "next/link";
import { PolicyBackLink, PolicyLink } from "@/components/legal/PolicyNavigation";

export const metadata: Metadata = { title: "Contact & Support | CdM LMS" };

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-white px-5 py-10 text-slate-900 sm:px-8 sm:py-14 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-[72ch] text-base leading-7">
        <PolicyBackLink />
        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">Contact &amp; Support</h1>
        <p className="mt-5 text-slate-700 dark:text-slate-300">Get help with your CdM LMS account, coursework, or personal information through the responsible school office.</p>
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Accounts and enrollment</h2>
          <p className="mt-3">Contact or visit the Office of the Registrar for account requests, incorrect roster details, activation problems, and referral to your institute administrator for technical assistance.</p>
          <address className="mt-4 not-italic">Colegio de Montalban<br />Kasiglahan Village, San Jose<br />Rodriguez (Montalban), Rizal, Philippines 1860</address>
          <p className="mt-4">You can also <Link href="/forgot-password" className="underline underline-offset-4">reset your password</Link> or <Link href="/activate" className="underline underline-offset-4">request a new activation link</Link>.</p>
        </section>
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Coursework and technical problems</h2>
          <p className="mt-3">Contact your course instructor for deadlines, missing materials, grades, interrupted assessments, or integrity flags. For a technical issue, provide the course or activity, the time it occurred, your device or browser, and the error message. Remove other people's information from screenshots.</p>
          <p className="mt-3 font-medium">Never share your password, verification code, session token, or activation link.</p>
        </section>
        <section id="privacy" className="mt-10 scroll-mt-8">
          <h2 className="text-xl font-semibold">Privacy requests and security concerns</h2>
          <p className="mt-3">Ask the Office of the Registrar to refer your concern to the designated Data Protection Officer or responsible privacy office. Describe the information or processing concerned, the action you are requesting, and a safe way to contact you. Identity verification may be needed; provide only information requested through an authorized channel.</p>
          <p className="mt-3">Report suspected account misuse or accidental disclosure promptly through your institute administrator or the Registrar. You may also consult the <a href="https://privacy.gov.ph/file-a-complaint/" className="underline underline-offset-4">National Privacy Commission's complaint guidance</a>.</p>
          <p className="mt-3">Read the <PolicyLink href="/privacy" className="underline underline-offset-4">Privacy Policy</PolicyLink> and <PolicyLink href="/terms" className="underline underline-offset-4">Terms and Conditions</PolicyLink> for more details.</p>
        </section>
      </div>
    </main>
  );
}
