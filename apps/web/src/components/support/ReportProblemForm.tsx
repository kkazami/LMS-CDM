'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle2, Paperclip, Upload } from 'lucide-react';
import Button from '@/components/common/Button';
import { reportAreas, reportFileType, reportFileTypes, reportLimits } from '@/lib/support-report';
import type { InstituteTheme } from '@/lib/theme';

const field = 'mt-2 w-full rounded-xl border border-theme bg-elevated px-3.5 py-2.5 text-base text-primary-theme sm:text-sm';
const label = 'text-sm font-bold text-primary-theme';
const help = 'mt-1 text-sm text-secondary-theme';
const link = 'font-semibold text-(--institute-ink) underline underline-offset-4';

export default function ReportProblemForm({ theme }: { theme: InstituteTheme }) {
  const picker = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function chooseFile(files: FileList | null) {
    if (!files?.length) return;
    const file = files[0];
    if (files.length > 1) return setFileError('Choose one file.');
    if (!reportFileType(file.name)) return setFileError('Choose a JPG, PNG, WebP, MP4, MOV, or WebM file.');
    if (!file.size || file.size > reportLimits.attachment) return setFileError('Choose a non-empty file up to 4 MB.');
    setFileError('');
    setAttachment(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    if (attachment) data.set('attachment', attachment);
    pending.current = true;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/support-tickets', { method: 'POST', body: data });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.message || 'Could not send your report. Try again.');
        return;
      }
      setAttachment(null);
      setFileError('');
      setSubmitted(true);
    } catch {
      setError('Could not send your report. Check your connection and try again.');
    } finally {
      pending.current = false;
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="report-heading" className="@container mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 id="report-heading" className="text-2xl font-extrabold tracking-tight text-primary-theme sm:text-3xl">Report a problem</h1>
        <p className={help}>Something wrong in the LMS? Tell us what happened.</p>
      </header>

      {submitted ? (
        <div className="rounded-2xl border border-theme bg-surface p-5 sm:p-6">
          <div role="status">
            <h2 ref={element => { element?.focus(); }} tabIndex={-1} className="flex items-center gap-2 text-lg font-bold text-primary-theme focus:outline-none">
              <CheckCircle2 aria-hidden="true" className="size-5 text-(--institute-ink)" /> Report sent
            </h2>
            <p className={help}>You can check for a reply in Help.</p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
            <Link href={`/${theme.code}/help#my-tickets`} className={link}>View my tickets</Link>
            <Button theme={theme} variant="secondary" onClick={() => setSubmitted(false)}>Send another report</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-2xl border border-theme bg-surface p-5 sm:p-6">
          <fieldset disabled={sending} className="grid min-w-0 gap-6 @min-[44rem]:grid-cols-[minmax(0,1fr)_minmax(15rem,0.48fr)]">
            <div className="min-w-0 space-y-5">
              <div>
                <label htmlFor="report-title" className={label}>Issue title</label>
                <input id="report-title" name="subject" required maxLength={reportLimits.title} className={field} />
              </div>
              <div>
                <label htmlFor="report-area" className={label}>Where did it happen?</label>
                <select id="report-area" name="area" required defaultValue="" className={field}>
                  <option value="" disabled>Choose a page or feature</option>
                  {Object.entries(reportAreas).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="report-description" className={label}>What happened?</label>
                <p id="report-description-help" className={help}>Tell us what went wrong and include any error message you saw.</p>
                <textarea id="report-description" name="description" required maxLength={reportLimits.description} rows={4} aria-describedby="report-description-help" className={`${field} resize-y`} />
              </div>
              <div>
                <label htmlFor="report-steps" className={label}>What did you do before it happened? <span className="font-normal text-secondary-theme">(optional)</span></label>
                <textarea id="report-steps" name="steps" maxLength={reportLimits.steps} rows={3} className={`${field} resize-y`} />
              </div>
            </div>

            <div className="min-w-0 self-start rounded-xl border border-theme bg-canvas p-4">
              <h2 className={label}>Attachment <span className="font-normal text-secondary-theme">(optional)</span></h2>
              <p id="report-attachment-help" className={help}>Add one screenshot or short video.</p>
              <input
                ref={picker}
                type="file"
                hidden
                accept={Object.keys(reportFileTypes).map(extension => `.${extension}`).join(',')}
                onChange={event => {
                  chooseFile(event.currentTarget.files);
                  event.currentTarget.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => picker.current?.click()}
                onDragOver={event => event.preventDefault()}
                onDrop={event => {
                  event.preventDefault();
                  if (!pending.current) chooseFile(event.dataTransfer.files);
                }}
                aria-describedby="report-attachment-help report-file-types"
                className="mt-3 flex min-h-27 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-400/80 bg-surface px-3 py-4 text-sm text-primary-theme hover:bg-elevated dark:border-slate-500"
              >
                <Upload aria-hidden="true" className="mb-1 size-5 text-(--institute-ink)" />
                <span className="font-bold">{attachment ? 'Change file' : 'Choose file'}</span>
                <span className="hidden text-secondary-theme sm:block">or drop it here</span>
              </button>
              {attachment && (
                <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-secondary-theme">
                  <Paperclip aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 wrap-anywhere">{attachment.name}</span>
                  <button type="button" className={`min-h-11 shrink-0 cursor-pointer ${link}`} onClick={() => { setAttachment(null); setFileError(''); }}>Remove</button>
                </div>
              )}
              {fileError && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{fileError}</p>}
              <p id="report-file-types" className="mt-3 text-sm text-secondary-theme">JPG, PNG, WebP, MP4, MOV, or WebM. Up to 4 MB.</p>
            </div>
          </fieldset>

          {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
          <div className="mt-5 flex flex-col gap-3 border-t border-theme pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-secondary-theme">Leave out passwords and verification codes.</p>
            <Button type="submit" theme={theme} loading={sending} className="shrink-0">{sending ? 'Sending…' : 'Send report'}</Button>
          </div>
        </form>
      )}
    </section>
  );
}
