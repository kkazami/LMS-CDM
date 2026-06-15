"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import type { InstituteTheme } from "@/lib/theme";

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormProps = {
  theme: InstituteTheme;
  instituteCode: string;
};

export default function RegisterForm({
  theme,
  instituteCode,
}: RegisterFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    email: "",
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

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
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
        throw new Error(data.message || "Unable to register.");
      }

      router.push(`/login?institute=${instituteCode}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to register."
      );
    } finally {
      setIsSubmitting(false);
    }
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

      <Input
        id="password"
        name="password"
        label="Password"
        type="password"
        placeholder="Create a password"
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
          href={`/login?institute=${instituteCode}`}
          className="font-medium"
          style={{ color: theme.colors.primary }}
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}