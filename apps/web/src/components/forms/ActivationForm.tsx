"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Circle, GraduationCap, LoaderCircle, LockKeyhole } from "lucide-react";
import Input from "@/components/common/Input";
import { rosterRequest } from "@/components/admin/roster-client";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { withOpacity } from "@/lib/theme";
import styles from "./activation.module.css";

type ActivationAccount = { name: string; email: string; instituteCode: string };

export default function ActivationForm() {
  const router = useRouter();
  const invitationToken = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [account, setAccount] = useState<ActivationAccount | null>(null);
  const [inspecting, setInspecting] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const theme = getInstituteTheme(account?.instituteCode || "ics");

  useEffect(() => {
    const raw = invitationToken.current ?? new URLSearchParams(window.location.hash.slice(1)).get("token");
    invitationToken.current = raw;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!raw) { setInspecting(false); return; }
    let active = true;
    setToken(raw);
    rosterRequest<ActivationAccount>("/api/auth/activation/inspect", { token: raw })
      .then(value => { if (active) setAccount(value); })
      .catch(error => { if (active) setError(error.message); })
      .finally(() => { if (active) setInspecting(false); });
    return () => { active = false; };
  }, []);

  async function activate() {
    setBusy(true); setError("");
    try {
      const data = await rosterRequest<{ instituteCode: string }>("/api/auth/activation/complete", { token, password, confirmPassword });
      invitationToken.current = null;
      setToken(""); setPassword(""); setConfirm("");
      router.replace("/login?activated=1&institute=" + encodeURIComponent(data.instituteCode));
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  async function request() {
    setBusy(true); setError(""); setMessage("");
    try {
      const data = await rosterRequest<{ message: string }>("/api/auth/activation/request", { email });
      setMessage(data.message);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }

  const requirements = [
    { label: "8 or more characters", met: password.length >= 8 },
    { label: "An uppercase letter", met: /[A-Z]/.test(password) },
    { label: "A lowercase letter", met: /[a-z]/.test(password) },
    { label: "A number", met: /[0-9]/.test(password) },
  ];
  const score = requirements.filter(rule => rule.met).length;
  const tooLong = new TextEncoder().encode(password).length > 72;
  const validPassword = score === 4 && !tooLong;
  const strength = !password ? "Choose a password" : tooLong ? "Use a shorter password" : !validPassword ? "Needs a few changes" : password.length >= 12 ? "Strong" : "Good";
  const mismatched = confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <div className={styles.shell} style={{
      "--activation-accent": theme.colors.primary,
      "--activation-soft": withOpacity(theme.colors.primary, 0.1),
      "--activation-ink": theme.code === "ite" ? "#FFFFFF" : "#0F172A",
    } as CSSProperties}>
      <Link href="/" className={styles.brand} aria-label="CdM LMS home">
        <span className={styles.brandMark}><GraduationCap size={25} aria-hidden="true" /></span>
        <span><strong>CdM LMS</strong><span>{account ? theme.name : "Learning Management System"}</span></span>
      </Link>
      <section className={styles.card} aria-busy={busy || inspecting}>
        <div className={styles.lock}><LockKeyhole size={21} aria-hidden="true" /></div>
        <h1 className={styles.title}>{account ? "Set Your Password" : "Activate Your CdM LMS Account"}</h1>
        <p className={styles.intro}>{account ? "Make this learning space yours. Create a password to finish setting up your account." : "Your learning space is almost ready. Start with the link in your invitation email."}</p>
        {inspecting ? (
          <p className={styles.loading} role="status"><LoaderCircle size={18} className={styles.spinning} aria-hidden="true" /> Checking your invitation…</p>
        ) : account ? (
          <form className={styles.form} onSubmit={event => { event.preventDefault(); activate(); }}>
            <div className={styles.account}>
              <span className={styles.avatar} aria-hidden="true">{account.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span>
              <div><strong>{account.name}</strong><span>{account.email}</span></div>
            </div>
            <Input id="activation-password" label="New password" theme={theme} type="password" autoComplete="new-password" required disabled={busy}
              aria-describedby="password-rules password-strength" value={password} onChange={event => setPassword(event.target.value)} />
            <div className={styles.strength}>
              <div className={styles.meter} role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-valuetext={strength}>
                {requirements.map((rule, index) => <span key={rule.label} data-filled={index < score && !tooLong} />)}
              </div>
              <p id="password-strength" className={styles.strengthLabel} aria-live="polite">{strength}</p>
              <ul id="password-rules" className={styles.rules}>
                {requirements.map(rule => <li key={rule.label} data-met={rule.met}>{rule.met ? <Check size={14} aria-hidden="true" /> : <Circle size={11} aria-hidden="true" />}{rule.label}</li>)}
              </ul>
            </div>
            <Input id="activation-confirm-password" label="Confirm password" theme={theme} type="password" autoComplete="new-password" required disabled={busy}
              aria-invalid={mismatched || undefined} aria-describedby={mismatched ? "password-match" : undefined} value={confirmPassword} onChange={event => setConfirm(event.target.value)} />
            {mismatched && <p id="password-match" className={styles.fieldError}>The passwords don’t match yet.</p>}
            {tooLong && <p className={styles.fieldError}>This password is too long. Try using fewer characters.</p>}
            <button className={styles.primary} disabled={busy || !validPassword || password !== confirmPassword}>
              {busy ? <LoaderCircle size={17} className={styles.spinning} aria-hidden="true" /> : null}
              {busy ? "Activating…" : "Activate Account"}
              {!busy && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={event => { event.preventDefault(); request(); }}>
            <p className={styles.help}>Missing your link, or has it expired? Enter your registered email and we’ll help you get a new one.</p>
            <Input id="activation-email" label="Registered email address" theme={theme} type="email" autoComplete="email" required disabled={busy}
              value={email} onChange={event => setEmail(event.target.value)} />
            <button className={styles.primary} disabled={busy}>{busy ? "Please wait…" : "Request a New Activation Link"}<ArrowRight size={17} aria-hidden="true" /></button>
          </form>
        )}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {message && <p role="status" className={styles.success}>{message}</p>}
        <div className={styles.footer}>
          <Link href={account ? "/login?institute=" + encodeURIComponent(account.instituteCode) : "/login"} className={styles.back}><ArrowLeft size={15} aria-hidden="true" /> Back to Sign In</Link>
          <span><LockKeyhole size={12} aria-hidden="true" /> Secure account setup</span>
        </div>
      </section>
    </div>
  );
}
