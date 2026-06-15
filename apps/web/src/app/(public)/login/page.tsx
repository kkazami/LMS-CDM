import Card from "@/components/common/Card";
import LoginForm from "@/components/forms/LoginForm";
import { getInstituteTheme } from "@/lib/get-institute-theme";

type LoginPageProps = {
  searchParams?: Promise<{
    institute?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
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
          title="Sign in to Lumina LMS"
          description={`Access your ${theme.name} learning dashboard.`}
        >
          <LoginForm theme={theme} instituteCode={theme.code} />
        </Card>
      </div>
    </main>
  );
}