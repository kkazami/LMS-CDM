import { redirect } from "next/navigation";

export default async function ActivitiesRedirectPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  if (institute.toLowerCase() !== "ics") {
    redirect(`/${institute}`);
  }
  redirect(`/${institute}/activities/codelab`);
}
