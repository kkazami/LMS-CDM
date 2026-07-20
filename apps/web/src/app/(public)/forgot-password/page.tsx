import { getInstituteTheme } from "@/lib/get-institute-theme";
import ForgotPasswordForm from "@/components/forms/ForgotPasswordForm";

import Card from "@/components/common/Card";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{
    institute?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const instituteCode = resolvedSearchParams?.institute ?? "ics";
  const theme = getInstituteTheme(instituteCode);

  return (
    <main
      className="grid min-h-screen place-items-center p-4"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="w-full max-w-md">
        <Card
          title="" // Title is handled inside ForgotPasswordForm based on step
          description=""
        >
          <ForgotPasswordForm theme={theme} instituteCode={theme.code} />
        </Card>
      </div>
    </main>
  );
}
