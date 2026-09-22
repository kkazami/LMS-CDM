import { getSession } from "@/lib/auth-session";
import KxFeedPage from "@/features/knowledge-exchange/components/KxFeedPage";

interface PageProps {
  params: Promise<{
    institute: string;
  }>;
  searchParams: Promise<{
    tag?: string;
    courseId?: string;
  }>;
}

export default async function KnowledgeExchangeHomePage({
  params,
  searchParams,
}: PageProps) {
  const { institute } = await params;
  const { tag, courseId } = await searchParams;
  const session = await getSession();

  return (
    <KxFeedPage
      instituteCode={institute}
      userRole={session?.user?.role || "STUDENT"}
      currentUserId={session?.user?.id}
      initialTag={tag}
      initialCourseId={courseId}
    />
  );
}
