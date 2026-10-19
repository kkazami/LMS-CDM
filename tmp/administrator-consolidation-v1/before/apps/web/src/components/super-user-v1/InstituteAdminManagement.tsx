'use client';
import { useEffect, useRef, useState } from 'react';
type IA = { id: string; name: string; email: string; isActive: boolean; role: 'INSTITUTE_ADMIN'; createdAt: string; instituteCode: string };

export default function InstituteAdminManagement({ institute, selectedId }: { institute: string; selectedId?: string }) {
  const [accounts, setAccounts] = useState<IA[]>([]);
  const [message, setMessage] = useState('Loading institute administrators…');
  const [busy, setBusy] = useState(false);
  const loadVersion = useRef(0);
  const base = `/api/super-user/${institute}/institute-admins`;
  async function load(signal?: AbortSignal) {
    const version = ++loadVersion.current;
    try {
      const response = await fetch(selectedId ? `${base}/${encodeURIComponent(selectedId)}` : base, { cache: 'no-store', signal });
      const body = await response.json();
      if (signal?.aborted || version !== loadVersion.current) return;
      if (!response.ok) { setAccounts([]); setMessage(body.error?.message ?? 'Accounts unavailable.'); return; }
      setAccounts(selectedId ? [body.instituteAdmin] : body.instituteAdmins);
      setMessage('');
    } catch { if (!signal?.aborted && version === loadVersion.current) { setAccounts([]); setMessage('Accounts unavailable. Refresh to try again.'); } }
  }
  useEffect(() => { const abort = new AbortController(); void load(abort.signal); return () => abort.abort(); }, [institute, selectedId]);
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); loadVersion.current++; setBusy(true);
    const form = event.currentTarget, data = new FormData(form);
    try {
      const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name'), email: data.get('email') }) });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error?.message ?? 'Account creation unavailable.'); return; }
      await load(); form.reset(); setMessage('Account created. Operator handoff is required before access can be enabled.');
    } catch { setMessage('Creation outcome could not be confirmed. Refresh the account list before retrying.'); }
    finally { setBusy(false); }
  }
  async function changeStatus(account: IA) {
    if (!window.confirm(`${account.isActive ? 'Suspend' : 'Reactivate'} ${account.name}?${account.isActive ? ' Active sessions will end.' : ' Existing sessions will not be restored.'}`)) return;
    loadVersion.current++; setBusy(true);
    try {
      const response = await fetch(`${base}/${encodeURIComponent(account.id)}/${account.isActive ? 'suspend' : 'reactivate'}`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error?.message ?? 'Status change unavailable.'); return; }
      await load(); setMessage(body.warnings.includes('NO_ACTIVE_INSTITUTE_ADMIN') ? 'Status updated. This institute has no active administrator.' : 'Status updated.');
    } catch { setMessage('Status outcome could not be confirmed. Refresh before retrying.'); }
    finally { setBusy(false); }
  }
  return <section aria-labelledby="ia-management-title"><h1 id="ia-management-title" className="text-3xl font-semibold">Institute administrators</h1>
    <p className="mt-2 text-slate-600">Manage administrator access for {institute.toUpperCase()}. Credentials are handled by the authorized operator.</p>
    <p role="status" className="my-5 text-sm">{message}</p>
    {!selectedId && <form onSubmit={create} className="mb-8 flex flex-wrap items-end gap-4 rounded border bg-white p-5">
      <label className="grid gap-2 text-sm">Full name<input name="name" required minLength={2} maxLength={100} className="rounded border px-3 py-2" disabled={busy} /></label>
      <label className="grid gap-2 text-sm">Email<input name="email" type="email" required maxLength={254} className="rounded border px-3 py-2" disabled={busy} /></label>
      <button disabled={busy} className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50">Create pending account</button>
    </form>}
    <div className="overflow-x-auto rounded border bg-white"><table className="w-full text-left text-sm"><caption className="sr-only">Institute administrator accounts</caption><thead className="border-b bg-slate-100"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Access</th><th className="p-4">Action</th></tr></thead><tbody>{accounts.map(account => <tr key={account.id} className="border-b last:border-0"><td className="p-4"><a href={`/${institute}/academic-operations/institute-admins/${encodeURIComponent(account.id)}`} className="underline">{account.name}</a></td><td className="p-4">{account.email}</td><td className="p-4">{account.isActive ? 'Active' : 'Inactive'}</td><td className="p-4"><button onClick={() => void changeStatus(account)} disabled={busy} className="rounded border px-3 py-2 disabled:opacity-50">{account.isActive ? 'Suspend' : 'Reactivate'}</button></td></tr>)}</tbody></table>
    {!accounts.length && !message && <p className="p-5 text-slate-600">No institute administrators yet.</p>}</div>
  </section>;
}
