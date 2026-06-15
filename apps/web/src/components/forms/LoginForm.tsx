"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Input from "@/components/common/Input";
import Button from "@/components/common/Button";
import type { InstituteTheme } from "@/lib/theme";

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormProps = {
  theme: InstituteTheme;
  instituteCode: string;
};

export default function LoginForm({
  theme,
  instituteCode,
}: LoginFormProps) {
  const router = useRouter();

  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

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
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to sign in.");
      }

      router.push(`/${data.user.institute.code}`);
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
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
        placeholder="Enter your password"
        value={values.password}
        onChange={(event) => updateField("password", event.target.value)}
        theme={theme}
        required
      />

      {errorMessage ? (
        <p className="text-sm font-medium text-red-600">{errorMessage}</p>
      ) : null}

      <Button type="submit" theme={theme} disabled={isSubmitting}>
        {isSubmitting ? "Signing In..." : "Sign In"}
      </Button>

      <div className="flex items-center justify-between gap-3 text-sm text-gray-600">
        <span>New to Lumina LMS?</span>
        <Link
          href={`/register?institute=${instituteCode}`}
          className="font-medium"
          style={{ color: theme.colors.primary }}
        >
          Create an account
        </Link>
      </div>
    </form>
  );
}