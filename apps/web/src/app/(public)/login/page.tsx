import LoginClient from "@/components/forms/LoginClient";
import { headers } from "next/headers";

type LoginPageProps = {
  searchParams?: Promise<{
    institute?: string;
    desktop?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const instituteCode = resolvedSearchParams?.institute ?? "ics";
  
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isDesktopAdmin =
    resolvedSearchParams?.desktop === "admin" ||
    userAgent.includes("Electron") ||
    userAgent.includes("LuminaDesktopAdmin");

  return (
    <LoginClient
      initialInstituteCode={instituteCode}
      initialIsDesktopAdmin={isDesktopAdmin}
    />
  );
}