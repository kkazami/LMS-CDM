'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function AttendanceAssignments({ institute }: { institute: string }) {
  const [items, setItems] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => { let active = true; void fetch('/api/attendance/assignments', { cache: 'no-store' }).then(async response => response.ok ? response.json() : []).then(value => { if (active && Array.isArray(value)) setItems(value); }).catch(() => {}); return () => { active = false; }; }, []);
  if (!items.length) return null;
  return <section className="my-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4"><h2 className="font-semibold text-[var(--text-primary)]">Attendance helper assignments</h2><div className="mt-2 flex flex-wrap gap-3">{items.map(item => <Link className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border-color)] px-3 text-sm text-[var(--text-primary)] underline underline-offset-4" key={item.id} href={`/${institute}/courses/${item.id}/attendance`}>{item.title}</Link>)}</div></section>;
}
