import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function AdminDashboardPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  if (session.user.role.toUpperCase() !== "ADMIN") {
    // Basic protection: if not admin, push back to their respective role
    redirect(`/${institute}`);
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">Welcome, Administrator {session.user.name}</h2>
      <p className="mt-4 text-gray-600">This is your admin dashboard content.</p>
      <p className="mt-2 text-sm text-gray-500">Only administrators can see this page.</p>
    </div>
  );
}
