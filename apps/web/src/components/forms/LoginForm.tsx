"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PolicyLink } from "@/components/legal/PolicyNavigation";
import { LoaderCircle, LockKeyhole, LogIn, Mail } from "lucide-react";
import Input from "@/components/common/Input";
import { isDesktopAdmin as isDesktopAdminCheck } from "@/lib/electron-detect";
import { triggerNativeHaptic, syncSessionToNative } from "@/lib/mobile-bridge";
import type { InstituteTheme } from "@/lib/theme";
import styles from "./login.module.css";
import GoogleSignIn from "./GoogleSignIn";

type LoginFormValues = {
  identifier: string;
  password: string;
};

type LoginFormProps = {
  theme: InstituteTheme;
  instituteCode: string;
  isDesktopAdmin?: boolean;
  googleEnabled?: boolean;
};

export default function LoginForm({
  theme,
  instituteCode,
  isDesktopAdmin = false,
  googleEnabled = false,
}: LoginFormProps) {
  const [isDesktopMode, setIsDesktopMode] = useState<boolean>(isDesktopAdmin);

  useEffect(() => {
    if (
      !isDesktopMode &&
      (isDesktopAdmin ||
        isDesktopAdminCheck() ||
        new URLSearchParams(window.location.search).get("desktop") === "admin" ||
        (typeof navigator !== "undefined" && navigator.userAgent.includes("Electron")))
    ) {
      setIsDesktopMode(true);
    }
  }, [isDesktopAdmin, isDesktopMode]);

  const [values, setValues] = useState<LoginFormValues>({
    identifier: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const busy = isSubmitting || googleBusy;
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activated, setActivated] = useState(false);
  useEffect(() => { setActivated(new URLSearchParams(window.location.search).get('activated') === '1'); }, []);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('googleError') === '1') setErrorMessage('Google sign-in could not be completed. Check your selected institute and try again.'); }, []);

  function updateField<K extends keyof LoginFormValues>(
    key: K,
    value: LoginFormValues[K]
  ) {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (!acceptedPolicies) {
      setErrorMessage("Agree to the Terms and Conditions and acknowledge the Privacy Policy to sign in.");
      return;
    }
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...values,
          instituteCode,
          acceptedPolicies,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.acceptedPolicies?.[0] || data.message || "Unable to sign in.");
      }

      triggerNativeHaptic("success");
      if (data.token) {
        syncSessionToNative(data.token, data.user);
      }

      const role = data.user.role.toUpperCase();

      if (isDesktopMode && role !== "ADMIN") {
        setErrorMessage(
          "This application is restricted to administrators only. Students and instructors should use the web portal or mobile app."
        );
        await fetch("/api/auth/logout", { method: "POST" });
        return;
      }

      if (data.user.requiresEnrollment) { window.location.href = '/join-class'; return; }
      let targetPath = `/${data.user.institute.code}`;

      if (role === 'SUPER_USER') {
        targetPath += '/academic-operations';
      } else if (isDesktopMode || role === "ADMIN") {
        targetPath += "/admin";
      } else if (role === "STUDENT") {
        targetPath += "/students";
      } else if (role === "PROFESSOR" || role === "TEACHER" || role === 'INSTRUCTOR') {
        targetPath += "/teachers";
      }

      window.location.href = targetPath;
    } catch (error) {
      triggerNativeHaptic("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const registerLink = isDesktopMode
    ? `/register?institute=${instituteCode}&desktop=admin`
    : `/register?institute=${instituteCode}`;

  return (
    <form onSubmit={handleSubmit} className={styles.form} aria-busy={busy}>
      {activated && <p role="status" className={styles.status}>Account activated. You can now sign in.</p>}
      <div className={styles.field}>
        <Mail className={styles.fieldIcon} aria-hidden="true" />
        <Input
          id="identifier"
          name="identifier"
          label={isDesktopMode ? "Email" : "Email or student ID"}
          type="text"
          placeholder={isDesktopMode ? "Enter your email" : "Enter your email or student ID"}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={values.identifier}
          disabled={!ready || busy}
          onChange={(event) => updateField("identifier", event.target.value)}
          theme={theme}
          required
        />
      </div>

      <div>
        <div className={styles.field}>
          <LockKeyhole className={styles.fieldIcon} aria-hidden="true" />
          <Input
            id="password"
            name="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={values.password}
            disabled={!ready || busy}
            onChange={(event) => updateField("password", event.target.value)}
            theme={theme}
            required
          />
        </div>
        <div className={styles.forgot}>
          <Link
            href={`/forgot-password?institute=${instituteCode}`}
          >
            Forgot Password?
          </Link>
        </div>
      </div>

      <div className={styles.consent}>
        <input
          id="accepted-policies"
          name="acceptedPolicies"
          type="checkbox"
          required
          checked={acceptedPolicies}
          onChange={(event) => { setAcceptedPolicies(event.target.checked); setErrorMessage(''); }}
          disabled={!ready || busy}
          aria-labelledby="policy-consent-label"
        />
        <div>
          <label id="policy-consent-label" htmlFor="accepted-policies">
            I agree to the <PolicyLink href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions<span className="sr-only"> (opens in a new tab)</span></PolicyLink> and acknowledge the <PolicyLink href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy<span className="sr-only"> (opens in a new tab)</span></PolicyLink>.
          </label>
        </div>
      </div>

      <div className={styles.accountHelp}>
        <span>Need an account?</span>
        <Link
          href={registerLink}
        >
          Create student account
        </Link>
      </div>

      {errorMessage ? (
        <p role="alert" className={styles.error}>{errorMessage}</p>
      ) : null}

      <button type="submit" className={styles.submit} disabled={!ready || busy} onClick={() => triggerNativeHaptic("light")}>
        {isSubmitting ? <LoaderCircle className={styles.spinner} aria-hidden="true" /> : <LogIn aria-hidden="true" />}
        {isSubmitting ? "Signing In..." : "Sign In"}
      </button>
      {!isDesktopMode && googleEnabled && <GoogleSignIn instituteCode={instituteCode} acceptedPolicies={acceptedPolicies} disabled={!ready || busy} onBusyChange={setGoogleBusy} onError={setErrorMessage} />}
    </form>
  );
}
