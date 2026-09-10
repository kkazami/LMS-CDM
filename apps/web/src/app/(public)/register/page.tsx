import RegisterClient from "@/components/forms/RegisterClient";
import { headers } from "next/headers";

type RegisterPageProps = {
  searchParams?: Promise<{
    institute?: string;
    desktop?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const instituteCode = resolvedSearchParams?.institute ?? "ics";

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isDesktopAdmin =
    resolvedSearchParams?.desktop === "admin" ||
    userAgent.includes("Electron") ||
    userAgent.includes("LuminaDesktopAdmin");

  return (
    <RegisterClient
      initialInstituteCode={instituteCode}
      initialIsDesktopAdmin={isDesktopAdmin}
    />
  );
}