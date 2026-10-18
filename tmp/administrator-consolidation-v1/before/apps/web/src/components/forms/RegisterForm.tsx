"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import type { InstituteTheme } from "@/lib/theme";

type RegisterFormValues = {
  name: string;
  email: string;
  studentNumber: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormProps = {
  theme: InstituteTheme;
  instituteCode: string;
  isDesktopAdmin?: boolean;
};

export default function RegisterForm({
  theme,
  instituteCode,
  isDesktopAdmin = false,
}: RegisterFormProps) {
  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    email: "",
    studentNumber: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  function updateField<K extends keyof RegisterFormValues>(
    key: K,
    value: RegisterFormValues[K]
  ) {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (values.password !== values.confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    if (values.password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (!/[A-Z]/.test(values.password) || !/[a-z]/.test(values.password) || !/[0-9]/.test(values.password)) {
      setErrorMessage("Password must contain at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    const studentNumberRegex = /^\d{2}-\d{5}$/;
    if (!studentNumberRegex.test(values.studentNumber)) {
      setErrorMessage("Student number must be in the format XX-XXXXX (e.g. 23-00875).");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: values.name,
        email: values.email,
        studentNumber: values.studentNumber,
        role: "STUDENT",
        password: values.password,
        confirmPassword: values.confirmPassword,
        instituteCode,
      };

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to register.");
      }

      window.location.href = `/login?institute=${instituteCode}`;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginLink = `/login?institute=${instituteCode}`;

  if (isDesktopAdmin) {
    return (
      <div className="grid gap-4 p-6 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
        <h3 className="font-semibold text-amber-900 dark:text-amber-200">
          Administrator Registration Restricted
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-300">
          Administrator accounts cannot be self-registered through this portal. Please contact institutional administration to have an account provisioned.
        </p>
        <Link
          href={loginLink}
          className="inline-flex justify-center items-center px-4 py-2 rounded-lg text-sm font-medium text-white shadow-sm transition-all"
          style={{ backgroundColor: theme.colors.primary }}
        >
          Return to Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Input
        id="fullName"
        name="fullName"
        label="Full Name"
        placeholder="Alex Dela Cruz"
        value={values.name}
        onChange={(event) => updateField("name", event.target.value)}
        theme={theme}
        required
      />

      <Input
        id="email"
        name="email"
        label="Email"
        type="email"
        placeholder="student@school.edu"
        value={values.email}
        onChange={(event) => updateField("email", event.target.value)}
        theme={theme}
        required
      />

      <div className="grid gap-1">
        <Input
          id="studentNumber"
          name="studentNumber"
          label="Student Number"
          type="text"
          placeholder="e.g. 23-00875"
          value={values.studentNumber}
          onChange={(event) => {
            let val = event.target.value.replace(/[^\d-]/g, "");
            if (val.length === 2 && !val.includes("-") && event.target.value.length > values.studentNumber.length) {
              val = val + "-";
            }
            updateField("studentNumber", val.slice(0, 8));
          }}
          theme={theme}
          required
        />
        <p className="text-xs text-gray-500">Format: XX-XXXXX (e.g. 23-00875)</p>
      </div>

      <Input
        id="password"
        name="password"
        label="Password"
        type="password"
        placeholder="Min. 8 characters with upper, lower & number"
        value={values.password}
        onChange={(event) => updateField("password", event.target.value)}
        theme={theme}
        required
      />

      <Input
        id="confirmPassword"
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        placeholder="Confirm your password"
        value={values.confirmPassword}
        onChange={(event) => updateField("confirmPassword", event.target.value)}
        theme={theme}
        required
      />

      {errorMessage ? (
        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
      ) : null}

      <Button type="submit" theme={theme} disabled={isSubmitting}>
        {isSubmitting ? "Creating Account..." : "Create Account"}
      </Button>

      <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
        <span>Already have an account?</span>
        <Link
          href={loginLink}
          className="font-medium hover:underline"
          style={{ color: theme.colors.primary }}
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}