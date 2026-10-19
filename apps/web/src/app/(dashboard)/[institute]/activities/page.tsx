import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
import { redirect } from "next/navigation";

export default async function ActivitiesRedirectPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/activities/page.tsx", await params);

  const { institute } = await params;
  redirect(`/${institute}/activities/codelab`);
}
