'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import Button from '@/components/common/Button';
import { getInstituteTheme } from '@/lib/get-institute-theme';

const theme = getInstituteTheme('ics');
const steps = [
  { title: 'Write the instructions', text: 'Start with the MySQL example or create a lab. Add the objective and the steps students will follow on their own computers. Preview your instructions, then save the draft.' },
  { title: 'Publish the instructions', text: 'Publish the saved draft when the instructions are ready. This locks that version so every student receives the same steps. Students cannot see the lab yet.' },
  { title: 'Assign it to your class', text: 'Choose the published instructions, grading category, points and groups. Set the start date first, then the due date. Leaving the start date empty lets students begin as soon as you publish the classwork.' },
  { title: 'Publish the classwork', text: 'Check the classwork draft, then choose Publish classwork. Eligible students can now find it in Classwork. Their scores will use the category and points you selected.' },
];

export default function LabAuthoringTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; };
  }, []);
  return createPortal(<div className="relative z-[120] [&_[role=dialog]]:max-h-[85dvh] [&_[role=dialog]]:overflow-y-auto [&_[id=confirm-dialog-description]]:text-sm [&_[id=confirm-dialog-description]]:leading-6">
    <ConfirmDialog title={'Create a practical lab · ' + (step + 1) + ' of 4'} description={steps[step].text} onClose={onClose}>
      <p aria-live="polite" className="mb-4 font-semibold text-orange-700 dark:text-orange-300">{steps[step].title}</p>
      <ol aria-label="Lab creation tutorial" className="mb-6 flex gap-2">{steps.map((s, i) => <li key={s.title} aria-current={i === step ? 'step' : undefined} className={'h-1.5 flex-1 rounded-full ' + (i <= step ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700')}><span className="sr-only">{i + 1}. {s.title}{i === step ? ' (current)' : ''}</span></li>)}</ol>
      <div className="flex flex-wrap justify-between gap-3">
        <Button type="button" theme={theme} variant="ghost" onClick={onClose}>Skip tutorial</Button>
        <div className="flex gap-2">{step > 0 && <Button type="button" theme={theme} variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>}<Button type="button" theme={theme} onClick={() => step === steps.length - 1 ? onClose() : setStep(step + 1)}>{step === steps.length - 1 ? 'Start creating' : 'Next'}</Button></div>
      </div>
    </ConfirmDialog>
  </div>, document.body);
}
