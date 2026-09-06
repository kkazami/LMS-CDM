"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import { isDesktopAdmin as isDesktopAdminCheck } from "@/lib/electron-detect";
import type { InstituteTheme } from "@/lib/theme";

type RegisterFormValues = {
  name: string;
  email: string;
  adminId: string;
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

  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    email: "",
    adminId: "",
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

    // Only students require formatted student numbers. In the Desktop App, Administrators NEVER need student numbers!
    if (!isDesktopMode) {
      const studentNumberRegex = /^\d{2}-\d{5}$/;
      if (!studentNumberRegex.test(values.studentNumber)) {
        setErrorMessage("Student number must be in the format XX-XXXXX (e.g. 23-00875).");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload = isDesktopMode
        ? {
            name: values.name,
            email: values.email,
            uniqueId: values.adminId || undefined,
            role: "ADMIN",
            password: values.password,
            confirmPassword: values.confirmPassword,
            instituteCode,
          }
        : {
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

      const redirectUrl = isDesktopMode
        ? `/login?institute=${instituteCode}&desktop=admin`
        : `/login?institute=${instituteCode}`;

      window.location.href = redirectUrl;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const loginLink = isDesktopMode
    ? `/login?institute=${instituteCode}&desktop=admin`
    : `/login?institute=${instituteCode}`;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Input
        id="fullName"
        name="fullName"
        label={isDesktopMode ? "Administrator Full Name" : "Full Name"}
        placeholder={isDesktopMode ? "Dr. Maria Santos" : "Alex Dela Cruz"}
        value={values.name}
        onChange={(event) => updateField("name", event.target.value)}
        theme={theme}
        required
      />

      <Input
        id="email"
        name="email"
        label={isDesktopMode ? "Official Admin Email" : "Email"}
        type="email"
        placeholder={isDesktopMode ? "admin@school.edu" : "student@school.edu"}
        value={values.email}
        onChange={(event) => updateField("email", event.target.value)}
        theme={theme}
        required
      />

      {/* For Admin Desktop, Student Number is completely omitted! An optional Admin/Staff ID is provided instead */}
      {isDesktopMode ? (
        <div className="grid gap-1">
          <Input
            id="adminId"
            name="adminId"
            label="Admin / Staff ID (Optional)"
            type="text"
            placeholder="e.g. ADM-001"
            value={values.adminId}
            onChange={(event) => updateField("adminId", event.target.value)}
            theme={theme}
          />
          <p className="text-xs text-gray-500">Optional internal identifier for administrator directory.</p>
        </div>
      ) : (
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
      )}

      <Input
        id="password"
        name="password"
        label="Password"
        type="password"
        placeholder="Create a secure password"
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
        {isSubmitting
          ? isDesktopMode
            ? "Creating Administrator Account..."
            : "Creating Account..."
          : isDesktopMode
          ? "Register Administrator"
          : "Create Account"}
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