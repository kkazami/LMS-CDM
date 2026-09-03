import Card from "@/components/common/Card";
import RegisterForm from "@/components/forms/RegisterForm";
import { getInstituteTheme } from "@/lib/get-institute-theme";

type RegisterPageProps = {
  searchParams?: Promise<{
    institute?: string;
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const instituteCode = resolvedSearchParams?.institute ?? "ics";
  const theme = getInstituteTheme(instituteCode);

  return (
    <main
      className="flex min-h-[100dvh] flex-col items-center justify-center p-4 sm:p-6 py-8 sm:py-12 overflow-y-auto"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="w-full max-w-md my-auto">
        <Card
          title="Create your account"
          description={`Register for ${theme.name} and continue your learning journey.`}
        >
          <RegisterForm theme={theme} instituteCode={theme.code} />
        </Card>
      </div>
    </main>
  );
}