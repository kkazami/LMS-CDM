"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { isDesktopAdmin as isDesktopAdminCheck } from "@/lib/electron-detect";
import { triggerNativeHaptic, syncSessionToNative } from "@/lib/mobile-bridge";
import type { InstituteTheme } from "@/lib/theme";

type LoginFormValues = {
  identifier: string;
  password: string;
};

type LoginFormProps = {
  theme: InstituteTheme;
  instituteCode: string;
  isDesktopAdmin?: boolean;
};

export default function LoginForm({
  theme,
  instituteCode,
  isDesktopAdmin = false,
}: LoginFormProps) {
  const router = useRouter();

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
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [activated, setActivated] = useState(false);
  useEffect(() => { setActivated(new URLSearchParams(window.location.search).get('activated') === '1'); }, []);

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to sign in.");
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
    <form onSubmit={handleSubmit} className="grid gap-4">
      {activated && <p role="status" className="text-sm">Account activated. You can now sign in.</p>}
      <Input
        id="identifier"
        name="identifier"
        label={isDesktopMode ? "Email" : "Email or student ID"}
        type="text"
        placeholder={isDesktopMode ? "admin@school.edu" : "student@school.edu"}
        value={values.identifier}
        onChange={(event) => updateField("identifier", event.target.value)}
        theme={theme}
        required
      />

      <div className="grid gap-1">
        <Input
          id="password"
          name="password"
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={values.password}
          onChange={(event) => updateField("password", event.target.value)}
          theme={theme}
          required
        />
        <div className="flex justify-end mt-1">
          <Link
            href={`/forgot-password?institute=${instituteCode}`}
            className="text-xs font-medium hover:underline"
            style={{ color: theme.colors.primary }}
          >
            Forgot Password?
          </Link>
        </div>
      </div>

      {errorMessage ? (
        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
      ) : null}

      <Button type="submit" theme={theme} disabled={isSubmitting}>
        {isSubmitting ? "Signing In..." : "Sign In"}
      </Button>
      <Link href="/activate" className="text-sm underline underline-offset-4">Request a New Activation Link</Link>

      <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
        <span>Need an account?</span>
        <Link
          href={registerLink}
          className="font-medium hover:underline"
          style={{ color: theme.colors.primary }}
        >
          Contact the Registrar
        </Link>
      </div>
    </form>
  );
}
