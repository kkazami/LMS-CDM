import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function LearningMaterialsPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  return (
    <div>
      <p className="mt-1 text-gray-600">
        Browse course notes, handouts, reading lists, and other shared resources here.
      </p>
    </div>
  );
}