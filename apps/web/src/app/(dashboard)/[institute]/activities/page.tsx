import { redirect } from "next/navigation";

export default async function ActivitiesRedirectPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  redirect(`/${institute}/activities/codelab`);
}
