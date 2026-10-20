'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Plus, RefreshCw, Search, ShieldCheck, Users } from 'lucide-react';
import { Loading, LoadError } from './SuperUserOverview';
import { requestError, useSuperUserData, type AdminResponse, type InstituteAdmin } from './use-super-user-data';
import styles from './super-user.module.css';
import AdministratorEditor from './AdministratorEditor';
import AnimatedCount from './AnimatedCount';

export default function InstituteAdminManagement({ institute, selectedId }: { institute: string; selectedId?: string }) {
  const base = `/api/super-user/${institute}/institute-admins`;
  const { data, loading, error, reload } = useSuperUserData<AdminResponse>(selectedId ? `${base}/${encodeURIComponent(selectedId)}` : base);
  const [message, setMessage] = useState('');
  const [messageError, setMessageError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const accounts = data ? selectedId ? [data.instituteAdmin] : data.instituteAdmins : [];
  const filtered = accounts.filter(account => `${account.name} ${account.email}`.toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || account.isActive === (status === 'active')));
  const active = accounts.filter(account => account.isActive).length;
  const path = `/${institute}/academic-operations/institute-admins`;
  function report(value: string, failed = false) { setMessage(value); setMessageError(failed); }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); report('');
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: values.get('name'), email: values.get('email') }) });
      const body = await response.json();
      if (!response.ok) { report(requestError(response.status, body.error?.message), true); return; }
      form.reset(); setCreating(false); setQuery(''); setStatus('all'); reload();
      report('Administrator added. The account is inactive until the LMS administrator sets up the login details.');
    } catch { report('Could not confirm whether the account was created. Refresh the list before trying again.', true); }
    finally { setBusy(false); }
  }

  async function changeStatus(account: InstituteAdmin) {
    if (!window.confirm(account.isActive ? `Suspend ${account.name}? They will be signed out and will not be able to access the LMS.` : `Reactivate ${account.name}? They will be able to sign in once their login details are set up.`)) return;
    setBusy(true); report('');
    try {
      const response = await fetch(`${base}/${encodeURIComponent(account.id)}/${account.isActive ? 'suspend' : 'reactivate'}`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) { report(requestError(response.status, body.error?.message), true); return; }
      reload(); report(`${account.name} ${account.isActive ? 'has been suspended' : 'can sign in again'}.${body.warnings?.includes('NO_ACTIVE_ADMIN') ? ' This institute now has no active administrator.' : ''}`);
    } catch { report('Could not confirm the access change. Refresh the list before trying again.', true); }
    finally { setBusy(false); }
  }

  return <section aria-labelledby="ia-management-title">
    {selectedId && <Link className={styles.backLink} href={path}><ArrowLeft size={15} aria-hidden="true" />Back to administrators</Link>}
    <header className={styles.pageHeader}><div><h1 id="ia-management-title">{selectedId ? data?.instituteAdmin.name || 'Administrator details' : 'Administrators'}</h1><p>Manage who can administer {institute.toUpperCase()} accounts and courses.</p></div>{!selectedId && <button className={styles.primaryButton} disabled={busy} aria-expanded={creating} aria-controls="new-administrator" onClick={() => setCreating(value => !value)}><Plus size={17} aria-hidden="true" />{creating ? 'Cancel' : 'Add administrator'}</button>}</header>
    {message && <div className={styles.notice} data-tone={messageError ? 'error' : undefined} role={messageError ? 'alert' : 'status'}><ShieldCheck size={18} aria-hidden="true" /><p>{message}</p></div>}
    {!selectedId && creating && <form id="new-administrator" onSubmit={create} className={`${styles.panel} ${styles.form}`}><h2>Add an administrator</h2><p>Enter their name and email. New accounts start inactive; the LMS administrator must set up their login details before you can activate access.</p><div className={styles.formFields}><label>Full name<input autoFocus autoComplete="name" name="name" required minLength={2} maxLength={100} className={styles.field} disabled={busy} /></label><label>Email address<input autoComplete="email" name="email" type="email" required maxLength={254} className={styles.field} disabled={busy} /></label><button disabled={busy} className={styles.primaryButton}>{busy ? 'Adding…' : 'Add administrator'}</button></div></form>}
    {loading ? <div className={styles.panel}><Loading label="Loading administrators" /></div> : error ? <div className={styles.panel}><LoadError message={error} retry={reload} /></div> : <>
      {!selectedId && <dl className={styles.metrics}><div className={styles.metric}><dt>Administrators</dt><dd><AnimatedCount value={accounts.length} /></dd><p>In {institute.toUpperCase()}</p></div><div className={styles.metric}><dt>Active</dt><dd><AnimatedCount value={active} /></dd><p>Can sign in to the LMS</p></div><div className={styles.metric}><dt>Inactive</dt><dd><AnimatedCount value={accounts.length - active} /></dd><p>Access is disabled</p></div></dl>}
      {selectedId && data?.instituteAdmin && <AdministratorEditor key={data.instituteAdmin.id + data.instituteAdmin.email + data.instituteAdmin.name} account={data.instituteAdmin} institute={institute} onBusyChange={setBusy} onSaved={sessionsEnded => { report(sessionsEnded ? 'Administrator updated. Their active sessions have ended.' : 'Administrator profile saved.'); reload(); }} />}
      {active === 0 && <div className={styles.notice} data-tone="warning"><ShieldCheck size={18} aria-hidden="true" /><p>{selectedId ? 'This account is inactive. Login setup must be complete before it can be reactivated.' : 'No active administrator in this institute. Add an account or reactivate an existing administrator.'}</p></div>}
      <div className={styles.toolbar}>{!selectedId && <><label className={styles.search}><Search size={17} aria-hidden="true" /><span className={styles.srOnly}>Search administrators</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or email" /></label><select className={styles.select} aria-label="Filter by access" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All accounts</option><option value="active">Active</option><option value="inactive">Inactive</option></select></>}<button className={styles.button} onClick={() => { report(''); reload(); }} disabled={busy}><RefreshCw size={15} aria-hidden="true" />Refresh</button></div>
      <div className={styles.panel}>{filtered.length ? <div className={styles.tableWrap} role="region" aria-label="Administrator accounts" tabIndex={0}><table className={styles.table}><caption className={styles.srOnly}>Administrator accounts in {institute.toUpperCase()}</caption><thead><tr><th scope="col">Administrator</th><th scope="col">Access</th><th scope="col">Added</th><th scope="col">Action</th></tr></thead><tbody>{filtered.map(account => <tr key={account.id}><td>{selectedId ? <strong>{account.name}</strong> : <Link href={`${path}/${encodeURIComponent(account.id)}`}>{account.name}</Link>}<small>{account.email}</small></td><td><span className={styles.badge} data-active={account.isActive}>{account.isActive ? 'Active' : 'Inactive'}</span></td><td><time className={styles.date} dateTime={account.createdAt}>{new Date(account.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}</time></td><td><div className={styles.rowActions}>{!selectedId && <Link className={styles.button} href={`${path}/${encodeURIComponent(account.id)}`}>Edit</Link>}<button onClick={() => void changeStatus(account)} disabled={busy} className={styles.button} aria-label={`${account.isActive ? 'Suspend' : 'Reactivate'} ${account.name}`}>{account.isActive ? 'Suspend' : 'Reactivate'}</button></div></td></tr>)}</tbody></table></div> : <div className={styles.empty}><Users size={28} aria-hidden="true" /><h2>{accounts.length ? 'No matching administrators' : 'No administrators yet'}</h2><p>{accounts.length ? 'Try another name or change the access filter.' : 'Add an administrator to manage this institute’s accounts and courses.'}</p>{accounts.length > 0 && <button className={styles.button} onClick={() => { setQuery(''); setStatus('all'); }}>Clear filters</button>}</div>}<p className={styles.tableFooter} role="status">{filtered.length} {filtered.length === 1 ? 'administrator' : 'administrators'}{!selectedId && ` · ${institute.toUpperCase()}`}</p></div>
    </>}
  </section>;
}
