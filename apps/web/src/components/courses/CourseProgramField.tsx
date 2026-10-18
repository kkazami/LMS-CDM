"use client";

import { useEffect, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { getClassPrograms } from "@/app/(dashboard)/[institute]/courses/actions";

export default function CourseProgramField({ instituteCode, courseId, onReady, errors }: {
  instituteCode: string;
  courseId?: string;
  onReady: (ready: boolean) => void;
  errors?: string[];
}) {
  const id = useId();
  const { pending } = useFormStatus();
  const [data, setData] = useState<Awaited<ReturnType<typeof getClassPrograms>> | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    onReady(false);
    setData(null);
    setError("");
    getClassPrograms(instituteCode, courseId).then(result => {
      if (!active) return;
      setData(result);
      onReady(true);
    }).catch(() => {
      if (active) setError("Could not load programs. Try again before saving.");
    });
    return () => { active = false; };
  }, [instituteCode, courseId, onReady, attempt]);

  return <div className="space-y-1">
    <label htmlFor={id} className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Program</label>
    {data ? <select id={id} name="programId" defaultValue={data.currentProgram?.id ?? ""} disabled={pending}
      aria-describedby={`${id}-help`} aria-invalid={Boolean(errors?.length)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-orange-600 disabled:opacity-50 dark:border-[#3D4460] dark:bg-[#1E2132] dark:text-[#F0F2F8]">
      <option value="">No program assigned</option>
      {data.currentProgram && !data.programs.some(program => program.id === data.currentProgram?.id) && <option value={data.currentProgram.id}>{data.currentProgram.code} (inactive)</option>}
      {data.programs.map(program => <option key={program.id} value={program.id}>{program.code} · {program.name}</option>)}
    </select> : <p role="status" className="text-xs text-slate-600 dark:text-slate-300">{error || "Loading programs…"}</p>}
    {error && <button type="button" onClick={() => setAttempt(value => value + 1)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Retry loading programs</button>}
    <p id={`${id}-help`} className="text-xs text-slate-500 dark:text-slate-400">Optional. Select this class’s program, or leave it unassigned.</p>
    {errors?.map(message => <p key={message} role="alert" className="text-xs text-red-600">{message}</p>)}
  </div>;
}
