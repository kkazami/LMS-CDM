import { redirect } from "next/navigation";
import { requireLegacyActor } from "@/lib/super-user-v1/legacy-entry-guard";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function BackupPage({ params }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/backup/page.tsx");
  const { institute } = await params;
  redirect(`/${institute}/admin/database`);
}


