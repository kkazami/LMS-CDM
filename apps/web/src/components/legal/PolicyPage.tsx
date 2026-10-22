import { PolicyBackLink, PolicyLink } from "./PolicyNavigation";
import { POLICY_UPDATED, type PolicyDocument } from "@/lib/legal-content";

export default function PolicyPage({ document }: { document: PolicyDocument }) {
  return (
    <main className="min-h-screen bg-white px-5 py-10 text-slate-900 sm:px-8 sm:py-14 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl">
        <PolicyBackLink />
        <header className="max-w-3xl py-8 sm:py-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{document.title}</h1>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">CdM LMS · Colegio de Montalban · Updated {POLICY_UPDATED}</p>
          <p className="mt-5 text-base leading-7 text-slate-700 dark:text-slate-300">{document.introduction}</p>
        </header>
        <div className="grid items-start gap-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="border-y border-slate-200 py-5 dark:border-slate-800 lg:sticky lg:top-8">
            <h2 className="mb-3 text-sm font-bold">On this page</h2>
            <ul className="space-y-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              {document.sections.map(section => <li key={section.id}><a href={`#${section.id}`} className="block rounded py-1.5 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2">{section.title}</a></li>)}
            </ul>
          </nav>
          <article className="min-w-0 max-w-[72ch] space-y-10 text-base leading-7 text-slate-700 dark:text-slate-300">
            {document.sections.map(section => (
              <section id={section.id} key={section.id} className="scroll-mt-8">
                <h2 className="mb-4 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{section.title}</h2>
                <div className="space-y-4">{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
                {section.items && <ul className="mt-4 list-disc space-y-3 pl-5 marker:text-slate-500">{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
              </section>
            ))}
            <div className="border-t border-slate-200 pt-6 text-sm dark:border-slate-800">
              <p>Questions about this policy? <PolicyLink href="/support" className="font-semibold underline underline-offset-4">Contact &amp; Support</PolicyLink></p>
              <p className="mt-3">Read the <PolicyLink href={document.title === "Privacy Policy" ? "/terms" : "/privacy"} className="underline underline-offset-4">{document.title === "Privacy Policy" ? "Terms and Conditions" : "Privacy Policy"}</PolicyLink>.</p>
              {document.title === "Privacy Policy" && <p className="mt-3">Related guidance: <a href="https://privacy.gov.ph/implementing-rules%20regulations-data-privacy-act-2012/" className="underline underline-offset-4">Data Privacy Act implementing rules</a> and <a href="https://privacy.gov.ph/file-a-complaint/" className="underline underline-offset-4">National Privacy Commission complaints</a>.</p>}
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
