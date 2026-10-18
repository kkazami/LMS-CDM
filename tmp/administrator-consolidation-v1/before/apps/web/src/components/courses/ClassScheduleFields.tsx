"use client";

import { useId, useState } from "react";
import { WEEKDAYS } from "@/lib/student-calendar";

export default function ClassScheduleFields({ schedule, errors }: {
  schedule?: { scheduleDays: number[]; scheduleStart: string; scheduleEnd: string; scheduleStartDate: string | null; scheduleEndDate: string | null };
  errors?: Record<string, string[]>;
}) {
  const id = useId();
  const [startDate, setStartDate] = useState(schedule?.scheduleStartDate ?? "");
  const [endDate, setEndDate] = useState(schedule?.scheduleEndDate ?? "");
  const field = "min-w-0 w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100";
  return <fieldset className="space-y-3 text-slate-900 dark:text-slate-100">
    <legend className="text-sm font-semibold">Weekly class schedule *</legend>
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6, 0].map((day) => <label key={day} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-xs dark:border-slate-600">
        <input type="checkbox" name="scheduleDays" value={day} defaultChecked={schedule?.scheduleDays.includes(day)} />{WEEKDAYS[day].slice(0, 3)}
      </label>)}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <label htmlFor={`${id}-start`} className="min-w-0 space-y-1 text-xs">Start time (GMT+8)<input id={`${id}-start`} type="time" name="scheduleStart" required defaultValue={schedule?.scheduleStart} className={field} /></label>
      <label htmlFor={`${id}-end`} className="min-w-0 space-y-1 text-xs">End time (GMT+8)<input id={`${id}-end`} type="time" name="scheduleEnd" required defaultValue={schedule?.scheduleEnd} className={field} /></label>
    </div>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label htmlFor={`${id}-start-date`} className="min-w-0 space-y-1 text-xs">Class start date *<input id={`${id}-start-date`} type="date" name="scheduleStartDate" required value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className={field} /></label>
      <label htmlFor={`${id}-end-date`} className="min-w-0 space-y-1 text-xs">Class end date *<input id={`${id}-end-date`} type="date" name="scheduleEndDate" required value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className={field} /></label>
    </div>
    {["scheduleDays", "scheduleStart", "scheduleEnd", "scheduleStartDate", "scheduleEndDate"].map((key) => errors?.[key] && <p role="alert" key={key} className="text-xs text-red-600 dark:text-red-400">{errors[key][0]}</p>)}
    <p className="text-xs text-slate-600 dark:text-slate-300">Repeats on the selected weekdays from the start date through the end date, inclusive.</p>
  </fieldset>;
}
