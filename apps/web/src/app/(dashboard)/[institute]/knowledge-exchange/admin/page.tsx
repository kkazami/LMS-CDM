import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import KxDeanonymizationTable from "@/features/knowledge-exchange/components/KxDeanonymizationTable";
import type { KxDeanonymizedPostItem } from "@/features/knowledge-exchange/types";

interface PageProps {
  params: Promise<{
    institute: string;
  }>;
}

export default async function KnowledgeExchangeAdminPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session?.user?.id) {
    redirect(`/login?institute=${institute}`);
  }

  const role = (session.user.role as string) || "STUDENT";
  if (role.toUpperCase() !== "ADMIN") {
    redirect(`/${institute}/knowledge-exchange`);
  }

  const anonymousPosts = await db.kxPost.findMany({
    where: { isAnonymous: true },
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          studentNumber: true,
        },
      },
    },
  });

  const formattedPosts: KxDeanonymizedPostItem[] = anonymousPosts.map((p) => ({
    id: p.id,
    title: p.title,
    postType: p.postType,
    status: p.status,
    isAnonymous: p.isAnonymous,
    createdAt: p.createdAt.toISOString(),
    author: {
      id: p.author.id,
      name: p.author.name || "Unknown",
      email: p.author.email || "Unknown",
      role: p.author.role,
      studentNumber: p.author.studentNumber,
    },
  }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <KxDeanonymizationTable
        initialPosts={formattedPosts}
        instituteCode={institute}
      />
    </div>
  );
}
