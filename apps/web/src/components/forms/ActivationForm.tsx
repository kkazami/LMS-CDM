"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  rosterRequest,
  fieldClass,
  secondaryClass,
} from "@/components/admin/roster-client";
export default function ActivationForm() {
  const router = useRouter();
  const [token, setToken] = useState(""),
    [account, setAccount] = useState<{ name: string; email: string } | null>(
      null,
    );
  const [password, setPassword] = useState(""),
    [confirmPassword, setConfirm] = useState(""),
    [email, setEmail] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const raw = new URLSearchParams(window.location.hash.slice(1)).get("token");
    history.replaceState(null, "", window.location.pathname);
    if (!raw) return;
    setToken(raw);
    setBusy(true);
    rosterRequest<{ name: string; email: string }>(
      "/api/auth/activation/inspect",
      { token: raw },
    )
      .then(setAccount)
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }, []);
  async function activate() {
    setBusy(true);
    setError("");
    try {
      const data = await rosterRequest<{ instituteCode: string }>(
        "/api/auth/activation/complete",
        { token, password, confirmPassword },
      );
      setToken("");
      setPassword("");
      setConfirm("");
      router.replace(
        "/login?activated=1&institute=" +
          encodeURIComponent(data.instituteCode),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function request() {
    setBusy(true);
    setError("");
    try {
      const data = await rosterRequest<{ message: string }>(
        "/api/auth/activation/request",
        { email },
      );
      setMessage(data.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    password.length >= 12,
  ].filter(Boolean).length;
  return (
    <section className="w-full max-w-lg space-y-5 rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 dark:border-white/15 dark:bg-[#141721] dark:text-slate-100">
      <h1 className="text-2xl font-bold">
        {account ? "Set Your Password" : "Activate Your CdM LMS Account"}
      </h1>
      {account ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            activate();
          }}
        >
          <p>
            {account.name}
            <br />
            <span className="break-all text-sm">{account.email}</span>
          </p>
          <p id="password-rules" className="text-sm">
            Use at least 8 characters, including an uppercase letter, a
            lowercase letter, and a number. Maximum 72 UTF-8 bytes.
          </p>
          <label className="grid gap-2 text-sm">
            New password
            <input
              autoComplete="new-password"
              type="password"
              required
              className={fieldClass}
              aria-describedby="password-rules password-strength"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <p id="password-strength" className="text-sm" aria-live="polite">
            Password strength:{" "}
            {score < 4 ? "Needs improvement" : score === 4 ? "Good" : "Strong"}
          </p>
          <label className="grid gap-2 text-sm">
            Confirm password
            <input
              autoComplete="new-password"
              type="password"
              required
              className={fieldClass}
              value={confirmPassword}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button className={secondaryClass} disabled={busy}>
            {busy ? "Activating…" : "Activate Account"}
          </button>
        </form>
      ) : (
        <>
          <p className="text-sm">
            Use the link in your invitation email. If it has expired, request a
            new link below.
          </p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              request();
            }}
          >
            <label className="grid gap-2 text-sm">
              Registered email address
              <input
                type="email"
                autoComplete="email"
                required
                className={fieldClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className={secondaryClass} disabled={busy}>
              {busy ? "Please wait…" : "Request a New Activation Link"}
            </button>
          </form>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <Link
        className="inline-block py-2 text-sm underline underline-offset-4"
        href="/login"
      >
        Back to Sign In
      </Link>
    </section>
  );
}
