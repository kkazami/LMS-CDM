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
      className="grid min-h-screen place-items-center p-4"
      style={{ backgroundColor: theme.colors.background }}
    >
      <div className="w-full max-w-md">
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