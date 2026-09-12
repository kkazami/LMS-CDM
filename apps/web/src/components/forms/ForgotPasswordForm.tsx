"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import type { InstituteTheme } from "@/lib/theme";
import { ArrowLeft, CheckCircle2, RefreshCw, Mail, Edit3, ShieldAlert } from "lucide-react";

type ForgotPasswordFormProps = {
  theme: InstituteTheme;
  instituteCode: string;
};

export default function ForgotPasswordForm({
  theme,
  instituteCode,
}: ForgotPasswordFormProps) {
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to send verification code.");

      setSuccessMessage(data.message);
      if (data.devOtp) {
        setDevCode(data.devOtp);
      }
      setCountdown(60);
      setStep(2);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (countdown > 0 || isResending) return;

    setErrorMessage("");
    setIsResending(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to resend verification code.");

      setSuccessMessage("A fresh verification code has been sent!");
      if (data.devOtp) {
        setDevCode(data.devOtp);
      }
      setCountdown(60);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not resend code.");
    } finally {
      setIsResending(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to reset password.");

      setStep(3);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 3) {
    return (
      <div className="text-center animate-in fade-in zoom-in-95 duration-400">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="mb-2 text-2xl font-bold text-[#2C2727] dark:text-white">Password Reset!</h3>
        <p className="mb-6 text-sm text-gray-600 dark:text-slate-400">
          Your password has been changed successfully. You can now log in with your new credentials.
        </p>
        <Link
          href={`/login?institute=${instituteCode}`}
          className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
          style={{ backgroundColor: theme.colors.primary }}
        >
          Return to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link 
        href={`/login?institute=${instituteCode}`}
        className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Login
      </Link>

      <h2 className="mb-1 text-2xl font-bold tracking-tight text-[#2C2727] dark:text-white">
        {step === 1 ? "Forgot your password?" : "Verify & Reset"}
      </h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-slate-400">
        {step === 1 
          ? "Enter your registered email address and we'll send you a 6-digit code to reset your password."
          : `We've sent a 6-digit verification code to ${email}.`}
      </p>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30 p-3.5 text-sm font-medium text-red-700 dark:text-red-400">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/50 dark:bg-emerald-950/30 p-3.5 text-sm font-medium text-emerald-800 dark:text-emerald-300">
          {successMessage}
        </div>
      )}

      {devCode && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="font-semibold mb-1">🛠️ Local Development Mode:</div>
          <div>Code generated: <span className="font-mono font-bold text-sm tracking-wider">{devCode}</span></div>
          <button
            type="button"
            onClick={() => setOtp(devCode)}
            className="mt-1 text-xs underline font-medium hover:text-amber-950 dark:hover:text-white cursor-pointer"
          >
            Click to auto-fill OTP
          </button>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleRequestOtp} className="grid gap-4">
          <Input
            id="email"
            name="email"
            label="Email Address"
            type="email"
            placeholder="student@school.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            theme={theme}
            required
            autoComplete="email"
          />
          <Button type="submit" theme={theme} loading={isSubmitting}>
            {isSubmitting ? "Sending Code..." : "Send Reset Code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="grid gap-4">
          <div className="flex items-center justify-between px-1 -mt-2 mb-1">
            <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
              {email}
            </span>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp("");
                setErrorMessage("");
              }}
              className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-slate-300 dark:hover:text-white cursor-pointer transition-colors"
            >
              <Edit3 className="mr-1 h-3 w-3" />
              Change email
            </button>
          </div>

          <Input
            id="otp"
            name="otp"
            label="6-Digit Reset Code"
            type="text"
            maxLength={6}
            placeholder="••••••"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            theme={theme}
            required
            autoFocus
            className="text-center tracking-[0.4em] font-mono text-xl font-bold"
          />

          <div className="flex justify-end -mt-2">
            <button
              type="button"
              disabled={countdown > 0 || isResending}
              onClick={handleResendOtp}
              className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`mr-1.5 h-3 w-3 ${isResending ? "animate-spin" : ""}`} />
              {countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
            </button>
          </div>

          <Input
            id="newPassword"
            name="newPassword"
            label="New Password"
            type="password"
            placeholder="At least 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            theme={theme}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Input
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm New Password"
            type="password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            theme={theme}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Button type="submit" theme={theme} loading={isSubmitting}>
            {isSubmitting ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>
      )}
    </div>
  );
}
