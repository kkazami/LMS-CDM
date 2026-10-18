'use client';
import { useEffect, useRef, useState } from 'react';
type Account = { id: string; name: string; email: string; role: 'STUDENT' | 'INSTRUCTOR'; isActive: boolean };
export default function LowerTierAccountManagement({ institute, selectedId }: { institute: string; selectedId?: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]), [message, setMessage] = useState('Loading accounts…'), [busy, setBusy] = useState(false), [page, setPage] = useState(1), [totalPages, setTotalPages] = useState(1);
  const base = '/api/admin/users';
  const loadVersion = useRef(0);
  async function load(signal?: AbortSignal) {
    const version = ++loadVersion.current;
    try { const response = await fetch(selectedId ? `${base}/${encodeURIComponent(selectedId)}` : `${base}?page=${page}&instituteCode=${institute}`, { cache: 'no-store', signal });
      const body = await response.json(); if (signal?.aborted || version !== loadVersion.current) return;
      if (!response.ok) { setAccounts([]); setMessage(body.error?.message ?? 'Accounts unavailable.'); return; }
      setAccounts(selectedId ? [body.user] : body.data); setTotalPages(body.totalPages ?? 1); setMessage('');
    } catch { if (!signal?.aborted && version === loadVersion.current) setMessage('Accounts unavailable. Refresh to try again.'); }
  }
  useEffect(() => { const abort = new AbortController(); void load(abort.signal); return () => abort.abort(); }, [institute, selectedId, page]);
  async function update(event: React.FormEvent<HTMLFormElement>, account: Account) {
    event.preventDefault(); loadVersion.current++; setBusy(true); const form = new FormData(event.currentTarget);
    try { const response = await fetch(`${base}/${encodeURIComponent(account.id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.get('name'), email: form.get('email') }) });
      const body = await response.json(); if (!response.ok) { setMessage(body.error?.message ?? 'Account update unavailable.'); return; }
      await load(); setMessage('Account details updated.');
    } catch { setMessage('Update outcome could not be confirmed. Refresh before retrying.'); } finally { setBusy(false); }
  }
  async function status(account: Account) {
    if (!window.confirm(`${account.isActive ? 'Suspend' : 'Reactivate'} ${account.name}?`)) return;
    loadVersion.current++; setBusy(true);
    try { const response = await fetch(`${base}/${encodeURIComponent(account.id)}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !account.isActive }) });
      const body = await response.json(); if (!response.ok) { setMessage(body.error?.message ?? 'Status update unavailable.'); return; }
      await load(); setMessage('Account status updated.');
    } catch { setMessage('Status outcome could not be confirmed. Refresh before retrying.'); } finally { setBusy(false); }
  }
  return <section>{institute === 'ics' && !selectedId && <a href="/ics/institute-administration/faculty" className="mb-5 inline-block rounded-lg border px-4 py-2 text-sm font-semibold">Manage faculty &amp; Program Heads</a>}<h1 className="text-3xl font-semibold">Institute accounts</h1><p className="mt-2 text-slate-600">Student and instructor accounts in {institute.toUpperCase()}.</p><p role="status" className="my-5 text-sm">{message}</p>
    <div className="divide-y rounded border bg-white">{accounts.map(account => <article key={account.id} className="p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{account.role} · {account.isActive ? 'Active' : 'Inactive'}</p>
      {selectedId ? <form onSubmit={event => void update(event, account)} className="mt-4 flex flex-wrap items-end gap-4"><label className="grid gap-2 text-sm">Full name<input name="name" defaultValue={account.name} required minLength={2} maxLength={100} disabled={busy} className="rounded border px-3 py-2" /></label><label className="grid gap-2 text-sm">Email<input name="email" type="email" defaultValue={account.email} required disabled={busy} className="rounded border px-3 py-2" /></label><button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white">Save details</button></form> : <><a href={`/${institute}/institute-administration/accounts/${encodeURIComponent(account.id)}`} className="mt-1 block text-lg font-semibold underline">{account.name}</a><p className="mt-1 text-sm text-slate-600">{account.email}</p></>}
      <button onClick={() => void status(account)} disabled={busy} className="mt-4 rounded border px-4 py-2 text-sm">{account.isActive ? 'Suspend' : 'Reactivate'}</button>
    </article>)}{!accounts.length && !message && <p className="p-5">No student or instructor accounts.</p>}</div>
    {!selectedId && <nav aria-label="Account pages" className="mt-5 flex items-center gap-4"><button disabled={page === 1 || busy} onClick={() => setPage(value => value - 1)} className="rounded border px-4 py-2 disabled:opacity-50">Previous</button><span>Page {page}</span><button disabled={page >= totalPages || busy} onClick={() => setPage(value => value + 1)} className="rounded border px-4 py-2 disabled:opacity-50">Next</button></nav>}
  </section>;
}
