"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import type { InstituteTheme } from "@/lib/theme";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

type ForgotPasswordFormProps = {
  theme: InstituteTheme;
  instituteCode: string;
};

export default function ForgotPasswordForm({
  theme,
  instituteCode,
}: ForgotPasswordFormProps) {
  const router = useRouter();

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to send OTP.");

      setSuccessMessage(data.message);
      setStep(2);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");
    
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
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
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="mb-2 text-2xl font-bold text-[#2C2727]">Password Reset!</h3>
        <p className="mb-6 text-gray-600">
          Your password has been changed successfully. You can now log in with your new password.
        </p>
        <Link
          href={`/login?institute=${instituteCode}`}
          className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
        className="mb-6 inline-flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Login
      </Link>

      <h2 className="mb-2 text-2xl font-bold tracking-tight text-[#2C2727]">
        {step === 1 ? "Forgot your password?" : "Verify & Reset"}
      </h2>
      <p className="mb-6 text-sm text-gray-600">
        {step === 1 
          ? "Enter your email address and we'll send you a 6-digit code to reset your password."
          : `We've sent a code to ${email}. Please enter it below along with your new password.`}
      </p>

      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm font-medium text-red-600">
          {errorMessage}
        </div>
      )}
      {successMessage && step === 2 && (
        <div className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {successMessage}
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
          />
          <Button type="submit" theme={theme} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Reset Code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleResetPassword} className="grid gap-4">
          <Input
            id="otp"
            name="otp"
            label="6-Digit Reset Code"
            type="text"
            maxLength={6}
            placeholder="e.g. 123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            theme={theme}
            required
            className="text-center tracking-[0.5em] font-mono text-lg"
          />
          <Input
            id="newPassword"
            name="newPassword"
            label="New Password"
            type="password"
            placeholder="Enter your new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            theme={theme}
            required
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
          />
          <Button type="submit" theme={theme} disabled={isSubmitting}>
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      )}
    </div>
  );
}
