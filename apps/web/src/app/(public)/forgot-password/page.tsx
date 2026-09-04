import ForgotPasswordClient from "@/components/forms/ForgotPasswordClient";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{
    institute?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const instituteCode = resolvedSearchParams?.institute ?? "ics";

  return <ForgotPasswordClient initialInstituteCode={instituteCode} />;
}
