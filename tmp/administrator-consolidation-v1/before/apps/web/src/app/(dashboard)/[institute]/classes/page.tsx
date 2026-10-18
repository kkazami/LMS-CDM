import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ institute: string }>;
};

export default async function ClassesPage({ params }: PageProps) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/classes/page.tsx");

  const { institute } = await params;
  redirect(`/${institute}/courses`);
}

