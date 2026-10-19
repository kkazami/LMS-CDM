"use client";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Info, Mail, RefreshCw, Search, Send, Users } from "lucide-react";
import { rosterRequest } from "./roster-client";
import styles from "./roster.module.css";

const PAGE_SIZE = 15;
type Student = {
  id: string;
  name: string;
  email: string;
  studentNumber: string | null;
  section: string;
  program: string;
  isActive: boolean;
  activationStatus: string;
  invitationVersion: number;
  invitationStatus: string;
  lastSentAt: string | null;
  lastError: string | null;
};
type Sender = {
  enabled: boolean;
  healthy: boolean;
  verified?: boolean;
  paused: boolean;
  configurationError?: string | null;
  ready: boolean;
  availableToday: number;
  queuedCount: number;
  dailyLimit: number;
  estimatedCompletion: string | null;
  pauseReason?: string | null;
  lastHeartbeatAt?: string | null;
};
const statusLabels: Record<string, string> = {
  ALL: "All accounts", NOT_SENT: "Not invited", QUEUED: "Waiting to send",
  SENT: "Invitation sent", FAILED: "Could not send", DEAD: "Could not send", ACTIVATED: "Account active",
};
function deliveryProblem(sender: Sender) {
  if (sender.ready) return "";
  if (sender.configurationError) return sender.configurationError;
  if (!sender.enabled) return "Email invitations are turned off for this site.";
  if (sender.paused) return "Email delivery is paused. Check the email connection to resume it.";
  if (!sender.healthy) return "Automatic email delivery is not running. The system administrator needs to start it.";
  return "Check the email connection before sending invitations.";
}
export default function InvitationsPanel() {
  const [users, setUsers] = useState<Student[]>([]),
    [sender, setSender] = useState<Sender | null>(null),
    [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState("ALL"),
    [search, setSearch] = useState(""),
    [program, setProgram] = useState(""),
    [section, setSection] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);
  const loadVersion = useRef(0);
  const [confirmation, setConfirmation] = useState<{
    ids: string[];
    requestId: string;
    estimate: Sender;
  } | null>(null);
  const [editing, setEditing] = useState<Student | null>(null),
    [email, setEmail] = useState(""),
    [reason, setReason] = useState("");
  async function load() {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
      const data = await rosterRequest<{ users: Student[]; sender: Sender }>("/api/admin/invitations");
      if (version !== loadVersion.current) return;
      setUsers(data.users);
      setSender(data.sender);
      setLoaded(true);
      setPage(1);
      setConfirmation(null);
      setSelected(ids => ids.filter(id => data.users.some(u => u.id === id && u.isActive && u.activationStatus === "PENDING_ACTIVATION")));
    } catch (error) {
      if (version === loadVersion.current) throw error;
    } finally { if (version === loadVersion.current) setLoading(false); }
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
    return () => { loadVersion.current++; };
  }, []);
  const eligible = (u: Student) =>
    u.isActive && u.activationStatus === "PENDING_ACTIVATION";
  const filtered = users.filter(
    (u) =>
      (status === "ALL" || u.invitationStatus === status || (status === "FAILED" && u.invitationStatus === "DEAD")) &&
      (!program || u.program === program) &&
      (!section || u.section === section) &&
      [u.name, u.email, u.studentNumber ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageEligible = pageUsers.filter(eligible);
  const pageSelected = pageEligible.filter(u => selected.includes(u.id)).length;
  function changeFilter(update: () => void) {
    update();
    setPage(1);
    setSelected([]);
    setConfirmation(null);
  }
  function selectPage(checked: boolean) {
    const ids = pageEligible.map(u => u.id);
    setSelected(previous => checked
      ? [...new Set([...previous, ...ids])]
      : previous.filter(id => !ids.includes(id)));
    setConfirmation(null);
  }
  async function prepare(ids: string[]) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!ids.length) throw new Error("Select a student who has not activated their account.");
      if (ids.length > 500) throw new Error("Select at most 500 students.");
      const estimate = await rosterRequest<Sender>(
        "/api/admin/invitations?additional=" + ids.length,
      );
      setConfirmation({ ids, requestId: crypto.randomUUID(), estimate });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!confirmation) return;
    setBusy(true);
    setError("");
    try {
      const result = await rosterRequest<{ queued: number }>(
        "/api/admin/invitations",
        { userIds: confirmation.ids, requestId: confirmation.requestId },
      );
      setMessage(`${result.queued} ${result.queued === 1 ? "invitation is" : "invitations are"} waiting to send.`);
      setConfirmation(null);
      setSelected([]);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function correct() {
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const result = await rosterRequest<{ message: string }>(
        "/api/admin/users/" + editing.id + "/pending-email",
        { email, reason, invitationVersion: editing.invitationVersion },
        "PATCH",
      );
      setMessage(result.message);
      setSelected([editing.id]);
      setEditing(null);
      setConfirmation(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel} aria-label="Account invitations" aria-busy={busy || loading}>
      <header className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>Account Invitations</h2>
          <p className={styles.description}>
            Send students a link to set their password. Links expire after three days.
            Active accounts do not need an invitation.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.button} disabled={busy || loading}
            onClick={() => { setMessage(""); load().catch(e => setError(e.message)); }}>
            <RefreshCw size={15} aria-hidden="true" className={loading ? styles.spinning : undefined} />
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button className={styles.button} disabled={busy || loading || !loaded}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await rosterRequest("/api/admin/invitations", { action: "VERIFY_AND_RESUME" }, "PATCH");
                await load();
              } catch (e) { setError((e as Error).message); }
              finally { setBusy(false); }
            }}>
            <Mail size={15} aria-hidden="true" /> Check email connection
          </button>
        </div>
      </header>
      {sender && (
        <div className={styles.delivery} data-ready={sender.ready}>
          <div className={styles.deliveryInfo}>
            {sender.ready
              ? <CheckCircle2 size={18} aria-hidden="true" className={styles.deliveryIcon} />
              : <AlertCircle size={18} aria-hidden="true" className={styles.deliveryIcon} />}
            <div>
              <strong>{sender.ready ? "Email invitations are ready to send" : "Email delivery needs attention"}</strong>
              {!sender.ready && <p>{deliveryProblem(sender)}</p>}
              {sender.estimatedCompletion && <p>Expected finish: {new Date(sender.estimatedCompletion).toLocaleString()}</p>}
            </div>
          </div>
          <span className={styles.deliveryNumbers}>{sender.queuedCount} waiting to send · {sender.availableToday} emails left today</span>
        </div>
      )}
      {error && <p role="alert" className={`${styles.notice} ${styles.error}`}><AlertCircle size={16} aria-hidden="true" />{error}</p>}
      {message && <p role="status" className={`${styles.notice} ${styles.success}`}><CheckCircle2 size={16} aria-hidden="true" />{message}</p>}
      {loaded && !loading && !users.some(eligible) && users.length > 0 && (
        <p className={styles.notice}><Info size={16} aria-hidden="true" />No students are waiting for an account invitation.</p>
      )}
      <div className={styles.filters}>
        <label className={styles.label}>
          Search
          <span className={styles.searchField}>
            <Search size={16} aria-hidden="true" />
            <input className={styles.field} type="search" placeholder="Name, email or student ID" value={search}
              disabled={busy} onChange={e => changeFilter(() => setSearch(e.target.value))} />
          </span>
        </label>
        <label className={styles.label}>
          Status
          <select className={styles.field} value={status} disabled={busy}
            onChange={e => changeFilter(() => setStatus(e.target.value))}>
            {["ALL", "NOT_SENT", "QUEUED", "SENT", "FAILED", "ACTIVATED"].map(v => <option key={v} value={v}>{statusLabels[v]}</option>)}
          </select>
        </label>
        <label className={styles.label}>
          Program
          <select className={styles.field} value={program} disabled={busy}
            onChange={e => changeFilter(() => setProgram(e.target.value))}>
            <option value="">All programs</option>
            {[...new Set(users.map(u => u.program))].filter(Boolean).sort().map(v => <option key={v}>{v}</option>)}
          </select>
        </label>
        <label className={styles.label}>
          Section
          <select className={styles.field} value={section} disabled={busy}
            onChange={e => changeFilter(() => setSection(e.target.value))}>
            <option value="">All sections</option>
            {[...new Set(users.map(u => u.section))].filter(Boolean).sort().map(v => <option key={v}>{v}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.listActions}>
        <div className={styles.actions}>
          <button className={`${styles.button} ${styles.primary}`} disabled={busy || loading || !sender?.ready || !selected.length}
            onClick={() => prepare(selected)}>
            <Send size={15} aria-hidden="true" /> Send invitations{selected.length > 0 ? ` (${selected.length})` : ""}
          </button>
          <button className={styles.button}
            disabled={busy || loading || !sender?.ready || !pageUsers.some(u => eligible(u) && ["FAILED", "DEAD"].includes(u.invitationStatus))}
            onClick={() => prepare(pageUsers.filter(u => eligible(u) && ["FAILED", "DEAD"].includes(u.invitationStatus)).map(u => u.id))}>
            Retry failed on this page
          </button>
          <button className={`${styles.button} ${styles.textButton}`} disabled={busy || loading || !pageEligible.length}
            onClick={() => selectPage(pageSelected !== pageEligible.length)}>
            {pageEligible.length > 0 && pageSelected === pageEligible.length ? "Deselect this page" : "Select this page"}
          </button>
        </div>
        <div className={styles.selection} aria-live="polite">
          <span>{selected.length ? `${selected.length} selected across all pages` : "No accounts selected"}</span>
          {selected.length > 0 && <button className={`${styles.button} ${styles.textButton}`} disabled={busy}
            onClick={() => { setSelected([]); setConfirmation(null); }}>Clear selection</button>}
        </div>
      </div>
      {confirmation && (
        <div className={styles.inlineForm} role="region" aria-label="Confirm invitations">
          <h3>Send {confirmation.ids.length} {confirmation.ids.length === 1 ? "invitation" : "invitations"}?</h3>
          <p>{confirmation.estimate.queuedCount} waiting to send · {confirmation.estimate.availableToday} emails left in the current daily limit.</p>
          {confirmation.ids.length + confirmation.estimate.queuedCount > confirmation.estimate.availableToday && (
            <p>Invitations will be sent in batches across approximately {Math.max(2, Math.ceil((confirmation.ids.length + confirmation.estimate.queuedCount) / confirmation.estimate.dailyLimit))} days. Each setup link expires three days after its email is sent.</p>
          )}
          <p>Expected finish: {confirmation.estimate.estimatedCompletion ? new Date(confirmation.estimate.estimatedCompletion).toLocaleString() : "Not available yet"}</p>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} disabled={busy || !confirmation.estimate.ready} onClick={send}>
              {busy ? "Adding invitations…" : "Send invitations"}
            </button>
            <button className={styles.button} disabled={busy} onClick={() => setConfirmation(null)}>Cancel</button>
          </div>
        </div>
      )}
      {editing && (
        <form className={styles.inlineForm} onSubmit={e => { e.preventDefault(); correct(); }}>
          <h3>Correct email for {editing.name}</h3>
          <p>Old setup links will stop working. Send a new invitation after saving the email address.</p>
          <label className={styles.label}>Correct email
            <input required type="email" className={styles.field} value={email} disabled={busy} onChange={e => setEmail(e.target.value)} />
          </label>
          <label className={styles.label}>Reason
            <input required minLength={3} maxLength={500} className={styles.field} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} />
          </label>
          <div className={styles.actions}>
            <button className={`${styles.button} ${styles.primary}`} disabled={busy}>Save email address</button>
            <button type="button" className={styles.button} disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}
      {loading && <div className={styles.loading}>
        <p role="status">Loading student accounts…</p>
        {!loaded && Array.from({ length: 3 }, (_, i) => <div key={i} className={styles.skeleton} aria-hidden="true" />)}
      </div>}
      {loaded && <>
        <p className={styles.mobileHint}>Swipe the table to see all account details.</p>
        <div className={styles.tableScroll} role="region" aria-label="Student accounts" tabIndex={0}>
          <table className={styles.table}>
            <caption>Student invitation and activation status</caption>
            <thead><tr>
              <th scope="col">
                <input type="checkbox" className={styles.checkbox} aria-label="Select eligible accounts on this page"
                  checked={pageEligible.length > 0 && pageSelected === pageEligible.length}
                  ref={node => { if (node) node.indeterminate = pageSelected > 0 && pageSelected < pageEligible.length; }}
                  disabled={busy || loading || !pageEligible.length} onChange={e => selectPage(e.target.checked)} />
              </th>
              {["Student", "Program / Section", "Status", "Last sent", "Actions"].map(h => <th key={h} scope="col">{h}</th>)}
            </tr></thead>
            <tbody>{pageUsers.map(u => (
              <tr key={u.id} data-selected={selected.includes(u.id)}>
                <td>
                  <input type="checkbox" className={styles.checkbox} aria-label={"Select " + u.name}
                    checked={selected.includes(u.id)} disabled={!eligible(u) || busy || loading}
                    onChange={() => {
                      setSelected(previous => previous.includes(u.id) ? previous.filter(id => id !== u.id) : [...previous, u.id]);
                      setConfirmation(null);
                    }} />
                </td>
                <td><div className={styles.student}>
                  <span className={styles.avatar} aria-hidden="true">{u.name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join("")}</span>
                  <div><strong>{u.name}</strong><p className={styles.muted}>{u.studentNumber || "No student ID"}</p><p className={styles.email}>{u.email}</p></div>
                </div></td>
                <td><span className={styles.program}>{u.program || "Not assigned"}</span><p className={styles.muted}>{u.section || "No section"}</p></td>
                <td className={styles.accountDetails}>
                  <span className={styles.badge} data-status={u.invitationStatus}>{statusLabels[u.invitationStatus] ?? "Not invited"}</span>
                  {!u.isActive && <p className={styles.muted}>Suspended</p>}
                  {u.lastError && <p className={styles.muted}>The last email could not be sent. Check the email connection before retrying.</p>}
                </td>
                <td className={styles.date}>{u.lastSentAt ? new Date(u.lastSentAt).toLocaleString() : "Not sent"}</td>
                <td>{u.activationStatus === "PENDING_ACTIVATION" && (
                  <button className={styles.button} disabled={busy || loading} onClick={() => {
                    setEditing(u); setEmail(u.email); setReason(""); setConfirmation(null);
                  }}>Correct Email</button>
                )}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        {!filtered.length && <div className={styles.empty}><Users size={28} aria-hidden="true" />
          <p>{users.length === 0 ? "No student accounts yet. Import your student list first." : "No students match your search or filters."}</p>
        </div>}
        <footer className={styles.pagination}>
          <p aria-live="polite">Showing {filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} accounts</p>
          <nav className={styles.pageControls} aria-label="Account pagination">
            <button className={styles.button} disabled={busy || loading || currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft size={16} aria-hidden="true" />Previous
            </button>
            <span className={styles.pageLabel}>Page {currentPage} of {pageCount}</span>
            <button className={styles.button} disabled={busy || loading || currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
              Next<ChevronRight size={16} aria-hidden="true" />
            </button>
          </nav>
        </footer>
      </>}
    </section>
  );
}
