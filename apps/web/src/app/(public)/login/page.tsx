import LoginClient from "@/components/forms/LoginClient";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";

type LoginPageProps = {
  searchParams?: Promise<{
    institute?: string;
    dept?: string;
    desktop?: string;
    force?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const instituteCode = resolvedSearchParams?.institute ?? resolvedSearchParams?.dept ?? "ics";
  
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";
  const isDesktopAdmin =
    resolvedSearchParams?.desktop === "admin" ||
    userAgent.includes("Electron") ||
    userAgent.includes("LuminaDesktopAdmin") ||
    userAgent.includes("CdMDesktopAdmin");

  let existingUser = null;

  // Only check existing user if not explicitly requesting a forced fresh login
  if (!resolvedSearchParams?.force) {
    const session = await getSession();
    if (session?.user) {
      const userWithInstitute = await db.user.findUnique({
        where: { id: session.user.id },
        include: { institute: true },
      });
      if (userWithInstitute) {
        existingUser = {
          id: userWithInstitute.id,
          name: userWithInstitute.name,
          email: userWithInstitute.email,
          role: userWithInstitute.role,
          avatarUrl: userWithInstitute.avatarUrl,
          instituteCode: userWithInstitute.institute?.code || instituteCode,
        };
      }
    }
  }

  return (
    <LoginClient
      initialInstituteCode={instituteCode}
      initialIsDesktopAdmin={isDesktopAdmin}
      existingUser={existingUser}
    />
  );
}