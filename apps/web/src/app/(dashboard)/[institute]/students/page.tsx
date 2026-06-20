import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function StudentDashboardPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">Welcome, {session.user.name}</h2>
      <p className="mt-4 text-gray-600">This is your student dashboard content.</p>
    </div>
  );
}
