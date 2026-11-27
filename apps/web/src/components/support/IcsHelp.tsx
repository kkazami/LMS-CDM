'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import Button from '@/components/common/Button';
import { findIcsHelpGuides, getIcsHelpGuides, helpQuestionLimit, type IcsHelpGuide, type IcsHelpRole } from '@/lib/ics-help-guides';
import type { InstituteTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

type Result = { question: string; answer: string | null; notice?: string };

const questionExamples: Record<IcsHelpRole, string> = {
  STUDENT: 'How do I mark my attendance?',
  INSTRUCTOR: 'How do I start an attendance session?',
  ADMIN: 'Where do I check the status of a backup?',
};

function GuideLink({ guide }: { guide: IcsHelpGuide }) {
  return (
    <Link href={guide.href} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-(--institute-ink) hover:underline">
      {guide.link} <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
    </Link>
  );
}

function HelpGuide({ guide, className }: { guide: IcsHelpGuide; className: string }) {
  return (
    <details className={cn('group text-sm', className)}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 font-medium text-primary-theme [&::-webkit-details-marker]:hidden">
        {guide.title} <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-secondary-theme group-open:rotate-180" />
      </summary>
      <p className="leading-relaxed text-secondary-theme">{guide.answer}</p>
      <GuideLink guide={guide} />
    </details>
  );
}

export function IcsHelp({ theme, role, onContact }: { theme: InstituteTheme; role: IcsHelpRole; onContact: (question: string) => void }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const related = result ? findIcsHelpGuides(result.question, role) : [];
  const guideAnswer = result?.answer ? undefined : related[0];
  const additionalGuides = guideAnswer ? related.slice(1) : related;
  const answer = result && (result.answer ?? guideAnswer?.answer ?? result.notice ?? 'I couldn’t find an answer for that question.');

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = question.trim();
    if (!submitted || pending) return;

    const guides = findIcsHelpGuides(submitted, role);
    if (role === 'ADMIN' || (guides.length > 0 && guides.every((guide) => guide.direct))) {
      setResult({ question: submitted, answer: null });
      return;
    }

    setPending(true);
    setResult(null);
    try {
      const response = await fetch('/api/help/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: submitted }),
        signal: AbortSignal.timeout(18_000),
      });
      if (!response.ok) {
        const notice = response.status === 429
          ? 'You’ve asked several questions. Try again in a minute.'
          : response.status === 401 ? 'Sign in again to ask a question.' : 'Answers are temporarily unavailable.';
        setResult({ question: submitted, answer: null, notice });
        return;
      }
      const data = await response.json();
      setResult({
        question: submitted,
        answer: typeof data.answer === 'string' ? data.answer : null,
        notice: data.available === false ? 'Live answers are temporarily unavailable.' : undefined,
      });
    } catch {
      setResult({ question: submitted, answer: null, notice: 'Answers are temporarily unavailable.' });
    } finally {
      setPending(false);
    }
  }

  return (
      <section aria-labelledby="ask-help" className="rounded-2xl border border-theme bg-surface p-5 sm:p-6">
        <h2 id="ask-help" className="text-lg font-semibold text-primary-theme">Ask a question</h2>
        <form onSubmit={ask} className="mt-4 space-y-3">
          <label htmlFor="help-question" className="block text-sm font-medium text-primary-theme">What do you need help with?</label>
          <textarea
            id="help-question"
            aria-describedby="help-question-hint"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={helpQuestionLimit}
            rows={3}
            required
            placeholder={questionExamples[role]}
            className="block w-full resize-y rounded-xl border border-theme bg-canvas px-3.5 py-3 text-base text-primary-theme placeholder:text-secondary-theme focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--institute-ink) sm:text-sm"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p id="help-question-hint" className="text-sm text-secondary-theme">{role === 'ADMIN' ? 'Search the admin guides. ' : 'AI answers use the LMS guides. '}Leave out passwords, codes, and personal details.</p>
            <Button theme={theme} type="submit" loading={pending} disabled={!question.trim()}>{pending ? 'Looking for an answer…' : 'Ask'}</Button>
          </div>
        </form>
        <div role="status" aria-atomic="true" className="sr-only">
          {pending ? 'Looking for an answer.' : answer}
        </div>
        {result && (
          <div className="mt-5 space-y-3 rounded-xl border border-theme bg-canvas p-4 text-sm leading-relaxed">
            <h3 className="wrap-anywhere font-semibold text-primary-theme">{result.question}</h3>
            <p className="wrap-anywhere whitespace-pre-wrap text-secondary-theme">
              {answer}
            </p>
            {guideAnswer && <div><GuideLink guide={guideAnswer} /></div>}
            {additionalGuides.length > 0 && (
              <div className="space-y-2 border-t border-theme pt-3">
                <h4 className="font-semibold text-primary-theme">Related guides</h4>
                {additionalGuides.map((guide) => <HelpGuide key={guide.title} guide={guide} className="rounded-lg border border-theme bg-surface px-3" />)}
              </div>
            )}
            <Button theme={theme} type="button" variant="secondary" onClick={() => onContact(result.question)}>
              Ask support
            </Button>
          </div>
        )}
      </section>
  );
}

export function IcsHelpGuides({ role }: { role: IcsHelpRole }) {
  const sections = new Map<string, IcsHelpGuide[]>();
  for (const guide of getIcsHelpGuides(role)) {
    const name = guide.section ?? 'Classes and coursework';
    const items = sections.get(name) ?? [];
    items.push(guide);
    sections.set(name, items);
  }
  return (
      <section aria-labelledby="help-guides" className="min-w-0 space-y-4">
        <h2 id="help-guides" className="mb-3 text-lg font-semibold text-primary-theme">Common questions</h2>
        {[...sections].map(([name, guides]) => (
          <div key={name}>
            <h3 className="mb-2 text-sm font-semibold text-secondary-theme">{name}</h3>
            <div className="divide-y divide-(--border-color) rounded-2xl border border-theme bg-surface">
              {guides.map((guide) => <HelpGuide key={guide.title} guide={guide} className="px-5 sm:px-6" />)}
            </div>
          </div>
        ))}
      </section>
  );
}
