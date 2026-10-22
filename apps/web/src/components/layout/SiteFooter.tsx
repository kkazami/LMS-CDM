import Link from "next/link";
import { PolicyLink } from "@/components/legal/PolicyNavigation";

export default function SiteFooter({ dark = false }: { dark?: boolean }) {
  const linkStyle = "inline-block rounded py-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4";
  return (
    <footer id="site-footer" className={`border-t px-5 py-10 sm:px-8 ${dark ? "border-slate-800 bg-[#06090F] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"}`}>
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className={`${linkStyle} text-xl font-bold`}>CdM LMS</Link>
            <p className="mt-1 text-sm font-semibold">Colegio de Montalban</p>
            <p className="mt-3 text-sm leading-6">Your campus, connected. Courses, learning materials, assessments, and academic updates in one place.</p>
            <address className="mt-3 text-sm not-italic leading-6">Kasiglahan Village, San Jose, Rodriguez (Montalban), Rizal, Philippines 1860</address>
          </div>
          <nav aria-label="Institute portals">
            <h2 className="mb-3 text-sm font-bold">Institutes</h2>
            <ul className="space-y-1 text-sm">
              <li><Link href="/login?institute=ics" className={linkStyle}>Computing Studies (ICS)</Link></li>
              <li><Link href="/login?institute=ite" className={linkStyle}>Teacher Education (ITE)</Link></li>
              <li><Link href="/login?institute=ibe" className={linkStyle}>Business &amp; Entrepreneurship (IBE)</Link></li>
            </ul>
          </nav>
          <nav aria-label="Account help">
            <h2 className="mb-3 text-sm font-bold">Access &amp; support</h2>
            <ul className="space-y-1 text-sm">
              <li><Link href="/login" className={linkStyle}>Student &amp; faculty sign in</Link></li>
              <li><Link href="/register" className={linkStyle}>Request an account</Link></li>
              <li><Link href="/forgot-password" className={linkStyle}>Reset your password</Link></li>
              <li><Link href="/activate" className={linkStyle}>Account activation</Link></li>
              <li><PolicyLink href="/support" className={linkStyle}>Contact &amp; support</PolicyLink></li>
            </ul>
          </nav>
          <nav aria-label="Policies">
            <h2 className="mb-3 text-sm font-bold">Policies &amp; your data</h2>
            <ul className="space-y-1 text-sm">
              <li><PolicyLink href="/terms" className={linkStyle}>Terms and Conditions</PolicyLink></li>
              <li><PolicyLink href="/privacy" className={linkStyle}>Privacy Policy</PolicyLink></li>
              <li><PolicyLink href="/privacy#cookies-and-device-storage" className={linkStyle}>Cookies &amp; device storage</PolicyLink></li>
              <li><PolicyLink href="/support#privacy" className={linkStyle}>Privacy requests</PolicyLink></li>
            </ul>
          </nav>
        </div>
        <div className={`mt-8 flex flex-wrap justify-between gap-3 border-t pt-5 text-xs leading-5 ${dark ? "border-slate-800" : "border-slate-200 dark:border-slate-800"}`}>
          <p>© {new Date().getFullYear()} Colegio de Montalban. All rights reserved.</p>
          <p>A capstone project for Colegio de Montalban.</p>
        </div>
      </div>
    </footer>
  );
}
